// server/controllers/vision.js
// Ensure this code is at the top
console.log('Loading vision controller...');

const mongoose = require('mongoose');
const { logger } = require('../utils/logger');
const VisionResult = require('../models/VisionResult');
const frameProcessor = require('../services/frameProcessor');
const frameCapture = require('../services/frameCapture');
const Stream = require('../models/Stream');
const Prompt = require('../models/Prompt');
const path = require('path');
const fs = require('fs');
const threadManager = require('../services/threadManager');
const embeddingService = require('../services/embeddingService');

// Ensure Ollama model is available and download it if needed
(async () => {
  try {
    const axios = require('axios');
    const OLLAMA_API = process.env.OLLAMA_API_URL || 'http://localhost:11434/api';
    const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'nomic-embed-text:v1.5';
    
    // Check if model exists
    const response = await axios.get(`${OLLAMA_API}/tags`);
    const modelExists = response.data.models.some(model => 
      model.name === EMBEDDING_MODEL || model.name.startsWith(`${EMBEDDING_MODEL}:`)
    );
    
    if (!modelExists) {
      logger.info(`Downloading Nomic Embed Text model (${EMBEDDING_MODEL})...`);
      await axios.post(`${OLLAMA_API}/pull`, { name: EMBEDDING_MODEL });
      logger.info(`Successfully downloaded ${EMBEDDING_MODEL}`);
    } else {
      logger.info(`Embedding model ${EMBEDDING_MODEL} is available`);
    }
  } catch (error) {
    logger.error(`Error setting up embedding model: ${error.message}`);
    logger.warn('Semantic search may not be available until Ollama is properly configured');
  }
})();

// Start a thread for a stream with a prompt
exports.startThread = async (req, res, next) => {
  try {
    const { streamId, promptId } = req.params;
    
    // Validate input
    if (!streamId || !promptId) {
      return res.status(400).json({ message: 'Stream ID and Prompt ID are required' });
    }
    
    // Start the thread
    const threadId = await threadManager.startThread(streamId, promptId);
    
    res.status(200).json({
      message: 'Thread started successfully',
      threadId
    });
  } catch (err) {
    logger.error(`Start thread error: ${err.message}`);
    next(err);
  }
};

// Stop a thread
exports.stopThread = async (req, res, next) => {
  try {
    const { threadId } = req.params;
    
    // Stop the thread
    const result = await threadManager.stopThread(threadId);
    
    if (result) {
      res.status(200).json({ message: 'Thread stopped successfully' });
    } else {
      res.status(404).json({ message: 'Thread not found' });
    }
  } catch (err) {
    logger.error(`Stop thread error: ${err.message}`);
    next(err);
  }
};

// Get thread status
exports.getThreadsStatus = async (req, res, next) => {
  try {
    // Add debugging to track execution
    console.log('getThreadsStatus called');
    logger.debug('getThreadsStatus called');
    
    const status = await threadManager.getThreadsStatus();
    
    // Add verbose logging to inspect the response
    //console.log(`Thread status response:`, status);
    logger.debug(`Thread status response: ${JSON.stringify(status)}`);
    
    // Make sure we return proper JSON and set the correct content type
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(status);
  } catch (err) {
    // Log the full error stack for debugging
    console.error(`Get threads status error:`, err);
    logger.error(`Get threads status error: ${err.stack}`);
    
    // Return proper error response in JSON format
    res.status(500).json({ 
      error: 'Failed to get thread status',
      message: err.message 
    });
  }
};

// Make sure all these exports are defined
exports.getQueueStatus = async (req, res, next) => {
  try {
    const status = await frameProcessor.getQueueStatus();
    res.status(200).json(status);
  } catch (err) {
    logger.error(`Get queue status error: ${err.message}`);
    next(err);
  }
};

exports.getStreamResults = async (req, res, next) => {
  try {
    const { streamId } = req.params;
    const { page = 1, limit = 20, promptId } = req.query;
    
    // Build query - streamId may need to be an ObjectId
    const mongoose = require('mongoose');
    const query = { 
      streamId: mongoose.Types.ObjectId.isValid(streamId) ? 
                mongoose.Types.ObjectId(streamId) : streamId 
    };
    
    if (promptId) {
      query.promptId = mongoose.Types.ObjectId.isValid(promptId) ? 
                      mongoose.Types.ObjectId(promptId) : promptId;
    }
    
    // Log the query for debugging
    logger.debug(`Vision results query: ${JSON.stringify(query)}`);
    
    // Calculate skip value for pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get total count for pagination info
    const total = await VisionResult.countDocuments(query);
    
    // Execute query with pagination
    const results = await VisionResult.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('promptId')
      .populate('streamId');
    
    // Get stream name for each result
    const formattedResults = results.map(result => ({
      ...result._doc,
      streamName: result.streamId ? result.streamId.name : 'Unknown Stream'
    }));
      
    // Log the result count
    logger.debug(`Found ${results.length} results for stream ${streamId}`);
    
    // Calculate pagination values
    const totalPages = Math.ceil(total / parseInt(limit));
    
    // ONLY send the response once with the formatted results
    res.status(200).json({
      docs: formattedResults,  // Use formattedResults instead of results
      totalDocs: total,
      limit: parseInt(limit),
      totalPages,
      page: parseInt(page),
      pagingCounter: skip + 1,
      hasPrevPage: parseInt(page) > 1,
      hasNextPage: parseInt(page) < totalPages,
      prevPage: parseInt(page) > 1 ? parseInt(page) - 1 : null,
      nextPage: parseInt(page) < totalPages ? parseInt(page) + 1 : null
    });
  } catch (err) {
    logger.error(`Get stream results error: ${err.message}`);
    next(err);
  }
};

exports.searchResults = async (req, res, next) => {
  try {
    const startTime = Date.now();
    const { 
      query, 
      streamId, 
      fromDate, 
      toDate, 
      page = 1, 
      limit = 20, 
      useEmbedding = true,
      similarity = 0.01,
      prioritize = null
    } = req.query;
    
    const parsedLimit = parseInt(limit);
    const parsedPage = parseInt(page);
    const skip = (parsedPage - 1) * parsedLimit;
    
    // Build the filter query (everything except the text search)
    const filter = {};
    
    // Add stream filter if provided
    if (streamId) {
      filter.streamId = mongoose.Types.ObjectId(streamId);
    }
    
    // Add date range if provided
    if (fromDate || toDate) {
      filter.timestamp = {};
      if (fromDate) {
        filter.timestamp.$gte = new Date(fromDate);
      }
      if (toDate) {
        filter.timestamp.$lte = new Date(toDate);
      }
    }
    
    let results = [];
    let total = 0;
    let searchMethod = 'basic';
    let similarityScores = [];
    
    // If query is provided, perform search
    if (query && query.trim()) {
      // Check if we should use embedding-based search
      if (useEmbedding === 'true' || useEmbedding === true) {
        logger.debug(`Performing semantic search with query: "${query}"`);
        
        // Generate embedding for the search query
        const embedding = await embeddingService.generateEmbedding(query);
        
        if (embedding) {
          searchMethod = 'semantic';
          
          // Get results with embeddings - approach more similar to searchResults.js
          // First, get documents that have embeddings
          const candidateResults = await VisionResult.find({
            ...filter,
            embedding: { $exists: true, $ne: null }
          })
          .sort({ timestamp: -1 })
          .limit(parsedLimit * 5) // Get more candidates to filter semantically
          .populate(['streamId', 'promptId'])
          .lean();
          
          if (candidateResults.length > 0) {
            // Calculate similarity for each result (like in searchResults.js)
            const resultsWithSimilarity = candidateResults
              .filter(doc => Array.isArray(doc.embedding) && doc.embedding.length > 0)
              .map(doc => {
                const similarity = embeddingService.cosineSimilarity(embedding, doc.embedding);
                return { ...doc, _similarity: similarity };
              })
              .filter(doc => doc._similarity >= parseFloat(similarity)) // Apply similarity threshold
              .sort((a, b) => b._similarity - a._similarity);
              
            total = resultsWithSimilarity.length;
            
            // Store similarity scores for stats
            similarityScores = resultsWithSimilarity.map(r => r._similarity || 0);
            
            // Apply post-processing according to prioritize parameter
            let processedResults = resultsWithSimilarity;
            if (prioritize === 'recent') {
              // Blend similarity with recency
              processedResults = blendSimilarityWithRecency(resultsWithSimilarity);
            }
            
            // Apply manual pagination
            results = processedResults.slice(skip, skip + parsedLimit);
          } else {
            logger.debug('No documents with embeddings found');
          }
        } else {
          // Fallback to text search if embedding generation fails
          logger.warn('Embedding generation failed, falling back to text search');
          searchMethod = 'text-fallback';
          const textSearchResults = await performTextSearch(query, filter, parsedLimit, skip);
          results = textSearchResults.results;
          total = textSearchResults.total;
        }
      } else {
        // Perform traditional text search
        logger.debug(`Performing text search with query: "${query}"`);
        searchMethod = 'text';
        const textSearchResults = await performTextSearch(query, filter, parsedLimit, skip);
        results = textSearchResults.results;
        total = textSearchResults.total;
      }
    } else {
      // No query provided, just fetch based on filters with pagination
      searchMethod = 'filter-only';
      total = await VisionResult.countDocuments(filter);
      results = await VisionResult.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .populate(['streamId', 'promptId']);
    }

    // Calculate average similarity score
    const averageSimilarity = similarityScores.length > 0 
      ? similarityScores.reduce((sum, score) => sum + score, 0) / similarityScores.length
      : null;
    
    // Transform results to include streamName and promptName
    const formattedResults = formatResults(results);
    
    // Calculate pagination values
    const totalPages = Math.ceil(total / parsedLimit);
    const executionTime = Date.now() - startTime;
    
    res.status(200).json({
      docs: formattedResults,
      totalDocs: total,
      limit: parsedLimit,
      totalPages,
      page: parsedPage,
      pagingCounter: skip + 1,
      hasPrevPage: parsedPage > 1,
      hasNextPage: parsedPage < totalPages,
      prevPage: parsedPage > 1 ? parsedPage - 1 : null,
      nextPage: parsedPage < totalPages ? parsedPage + 1 : null,
      searchMethod,
      averageSimilarity,
      executionTime
    });
  } catch (err) {
    logger.error(`Search results error: ${err.stack}`);
    next(err);
  }
};
// Helper functions
function formatResults(results) {
  return results.map(result => {
    // Determine event type based on detections
    let eventType = 'Detection';
    if (result.detections) {
      if (result.detections.fire) {
        eventType = 'Fire';
      } else if (result.detections.intrusion || 
                (result.result && (
                  result.result.includes('"theft":true') || 
                  result.result.includes('"gun":true')
                ))) {
        eventType = 'Intrusion';
      } else if (result.detections.medical) {
        eventType = 'Medical Emergency';
      }
    }
    
    // Format the result for the response
    // Handle both populated and non-populated results
    const resultObj = result._doc || result;
    const streamData = typeof resultObj.streamId === 'object' ? resultObj.streamId : null;
    const promptData = typeof resultObj.promptId === 'object' ? resultObj.promptId : null;
    
    return {
      ...resultObj,
      streamName: streamData ? streamData.name : 'Unknown Stream',
      promptName: promptData ? promptData.name : null,
      eventType: eventType,
      semanticScore: resultObj._similarity || null
    };
  });
}

async function populateResults(results) {
  // Fetch related data for populate
  const streamIds = [...new Set(results.map(r => r.streamId))];
  const promptIds = [...new Set(results.filter(r => r.promptId).map(r => r.promptId))];
  
  const [streams, prompts] = await Promise.all([
    Stream.find({ _id: { $in: streamIds } }),
    promptIds.length ? Prompt.find({ _id: { $in: promptIds } }) : []
  ]);
  
  // Create lookup maps
  const streamMap = Object.fromEntries(streams.map(s => [s._id.toString(), s]));
  const promptMap = Object.fromEntries(prompts.map(p => [p._id.toString(), p]));
  
  // Populate the results manually
  return results.map(result => {
    const streamIdStr = result.streamId.toString();
    const promptIdStr = result.promptId ? result.promptId.toString() : null;
    
    return {
      ...result,
      streamId: streamMap[streamIdStr] || null,
      promptId: promptIdStr ? promptMap[promptIdStr] || null : null,
      _semanticScore: result._similarity // Include the similarity score
    };
  });
}

function blendSimilarityWithRecency(results) {
  // Get the newest timestamp
  const newestTimestamp = Math.max(...results.map(r => new Date(r.timestamp).getTime()));
  const oldestTimestamp = Math.min(...results.map(r => new Date(r.timestamp).getTime()));
  const timeRange = newestTimestamp - oldestTimestamp || 1; // Avoid division by zero
  
  // Calculate blended score (70% similarity, 30% recency)
  return results.map(result => {
    const recencyScore = (new Date(result.timestamp).getTime() - oldestTimestamp) / timeRange;
    const blendedScore = (result._similarity * 0.7) + (recencyScore * 0.3);
    return { ...result, _blendedScore: blendedScore };
  }).sort((a, b) => b._blendedScore - a._blendedScore);
}

function extractSuggestionsFromResults(results, partialQuery) {
  // This is a simple implementation - could be enhanced with NLP
  const suggestions = new Set();
  const queryLower = partialQuery.toLowerCase();
  
  results.forEach(result => {
    if (!result.result) return;
    
    // Split the result text into sentences and words
    const sentences = result.result.split(/[.!?]+/);
    
    sentences.forEach(sentence => {
      const words = sentence.split(/\s+/);
      
      // Look for phrases containing the query terms
      for (let i = 0; i < words.length; i++) {
        if (words[i].toLowerCase().includes(queryLower)) {
          // Extract a phrase (3-5 words) around the matching word
          const start = Math.max(0, i - 2);
          const end = Math.min(words.length, i + 3);
          const phrase = words.slice(start, end).join(' ').trim();
          
          if (phrase.length > queryLower.length) {
            suggestions.add(phrase);
          }
        }
      }
    });
  });
  
  return Array.from(suggestions);
}
// Helper function for text search
async function performTextSearch(query, filter, limit, skip) {
  // Create text search query
  const searchQuery = {
    ...filter,
    $text: { $search: query }
  };
  
  const total = await VisionResult.countDocuments(searchQuery);
  
  const results = await VisionResult.find(searchQuery)
    .sort({ score: { $meta: 'textScore' } })
    .skip(skip)
    .limit(limit)
    .populate(['streamId', 'promptId']);
    
  return { results, total };
}

// Add a new endpoint to generate embeddings for testing
exports.generateEmbedding = async (req, res, next) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ message: 'Text is required' });
    }
    
    const embedding = await embeddingService.generateEmbedding(text);
    
    if (!embedding) {
      return res.status(500).json({ message: 'Failed to generate embedding' });
    }
    
    res.status(200).json({
      text,
      embedding,
      dimensions: embedding.length
    });
  } catch (error) {
    logger.error(`Generate embedding error: ${error.message}`);
    res.status(500).json({ 
      message: 'Failed to generate embedding',
      error: error.message
    });
  }
};

// Add an endpoint to backfill embeddings for existing results
exports.backfillEmbeddings = async (req, res, next) => {
  try {
    const { batchSize = 50 } = req.query;
    
    // Start the backfill process in the background
    const jobId = `backfill-${Date.now()}`;
    
    // Send the response immediately
    res.status(202).json({
      message: 'Embedding backfill job started',
      jobId
    });
    
    // Continue processing in the background
    backfillEmbeddingsProcess(parseInt(batchSize), jobId);
  } catch (error) {
    logger.error(`Backfill embeddings error: ${error.message}`);
    res.status(500).json({ 
      message: 'Failed to start embedding backfill',
      error: error.message
    });
  }
};

// Background process for backfilling embeddings
async function backfillEmbeddingsProcess(batchSize, jobId) {
  let processed = 0;
  let failed = 0;
  let total = 0;
  
  try {
    // Count documents that need embeddings
    total = await VisionResult.countDocuments({
      $or: [
        { embedding: { $exists: false } },
        { embedding: null }
      ],
      result: { $exists: true, $ne: null, $ne: '' }
    });
    
    logger.info(`[${jobId}] Starting embedding backfill for ${total} documents`);
    
    let hasMore = true;
    
    while (hasMore) {
      // Get a batch of documents that need embeddings
      const results = await VisionResult.find({
        $or: [
          { embedding: { $exists: false } },
          { embedding: null }
        ],
        result: { $exists: true, $ne: null, $ne: '' }
      })
      .limit(batchSize);
      
      if (results.length === 0) {
        hasMore = false;
        break;
      }
      
      // Process each document
      for (const result of results) {
        try {
          if (result.result) {
            const embedding = await embeddingService.generateEmbedding(result.result);
            
            if (embedding) {
              result.embedding = embedding;
              await result.save();
              processed++;
            } else {
              failed++;
            }
          } else {
            // Mark as processed even if there's no text
            result.embedding = [];
            await result.save();
            failed++;
          }
        } catch (error) {
          logger.error(`Error embedding document ${result._id}: ${error.message}`);
          failed++;
        }
        
        // Log progress every 10 documents
        if ((processed + failed) % 10 === 0) {
          logger.info(`[${jobId}] Processed ${processed + failed}/${total} documents. Success: ${processed}, Failed: ${failed}`);
        }
      }
    }
    
    logger.info(`[${jobId}] Embedding backfill completed. Processed: ${processed}, Failed: ${failed}, Total: ${total}`);
  } catch (error) {
    logger.error(`[${jobId}] Embedding backfill process failed: ${error.message}`);
  }
}

exports.processStreamFrame = async (req, res, next) => {
  try {
    const { streamId, promptId } = req.params;
    const { forceProcess = false } = req.body;
    
    // Verify stream and prompt exist
    const [stream, prompt] = await Promise.all([
      Stream.findById(streamId),
      Prompt.findById(promptId)
    ]);
    
    if (!stream) {
      return res.status(404).json({ message: 'Stream not found' });
    }
    
    if (!prompt) {
      return res.status(404).json({ message: 'Prompt not found' });
    }
    
    let jobId;
    try {
      logger.debug(`Attempting to queue frame for stream ${streamId} with prompt ${promptId}`);
      jobId = await frameProcessor.queueFrame(streamId, promptId, {
        forceProcess,
        priority: 5
      });
      
      logger.debug(`Queue result: ${jobId ? `Job ID: ${jobId}` : 'Job skipped'}`);
      
      if (!jobId) {
        return res.status(429).json({ 
          message: 'Frame skipped due to cooldown or no significant change',
          cooldown: true
        });
      }
    } catch (error) {
      logger.error(`Error queuing frame: ${error.stack}`);
      return res.status(500).json({ message: `Error queuing frame: ${error.message}` });
    }
    
    res.status(202).json({
      message: 'Frame queued for processing',
      jobId
    });
  } catch (err) {
    logger.error(`Process stream frame error: ${err.message}`);
    next(err);
  }
};

exports.getRecordingByTime = async (req, res) => {
  try {
    const { streamId } = req.params;
    const { timestamp } = req.query;
    
    if (!streamId || !timestamp) {
      return res.status(400).json({ message: 'Stream ID and timestamp are required' });
    }
    
    // First, try to find a VisionResult with a recording folder for this time
    const targetTime = new Date(timestamp);
    
    // Look for vision results around the target time (within 5 minutes)
    const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
    const startTime = new Date(targetTime.getTime() - fiveMinutes);
    const endTime = new Date(targetTime.getTime() + fiveMinutes);
    
    const visionResult = await VisionResult.findOne({
      streamId: streamId,
      timestamp: { $gte: startTime, $lte: endTime },
      'metadata.recordingFolder': { $exists: true }
    }).sort({ timestamp: -1 }); // Get the most recent one
    
    if (visionResult && visionResult.metadata && visionResult.metadata.recordingFolder) {
      return res.json({
        recordingFolder: visionResult.metadata.recordingFolder,
        timestamp: visionResult.timestamp,
        resultId: visionResult._id
      });
    }
    
    // If no vision result found, try to find a recording folder directly
    const recordingsDir = path.join(__dirname, '..', 'public', 'captures', streamId, 'HLS');
    
    // Check if directory exists
    if (!fs.existsSync(recordingsDir)) {
      return res.status(404).json({ message: 'No recordings found for this stream' });
    }
    
    // Get all recording directories
    const recordings = fs.readdirSync(recordingsDir)
      .filter(dir => dir.startsWith('recording_'))
      .map(dir => {
        const folderTimestamp = parseInt(dir.replace('recording_', ''));
        return {
          folder: dir,
          timestamp: folderTimestamp,
          date: new Date(folderTimestamp)
        };
      })
      .filter(rec => fs.existsSync(path.join(recordingsDir, rec.folder, 'playlist.m3u8'))); // Only include directories with playlist files
    
    if (recordings.length === 0) {
      return res.status(404).json({ message: 'No recordings found for this stream' });
    }
    
    // Sort recordings by timestamp (newest first)
    recordings.sort((a, b) => b.timestamp - a.timestamp);
    
    // Find the recording that contains the event time
    // For simplicity, we'll just find the closest recording
    let closestRecording = recordings[0];
    let minTimeDiff = Math.abs(targetTime - closestRecording.date);
    
    for (const recording of recordings) {
      const timeDiff = Math.abs(targetTime - recording.date);
      if (timeDiff < minTimeDiff) {
        minTimeDiff = timeDiff;
        closestRecording = recording;
      }
    }
    
    return res.json({
      recordingFolder: closestRecording.folder,
      timestamp: closestRecording.date,
      method: 'folder-search'
    });
    
  } catch (error) {
    console.error('Error getting recording by time:', error);
    return res.status(500).json({ message: 'Failed to get recording data' });
  }
};


// Add this to debug
console.log('Vision controller loaded with methods:', Object.keys(exports));