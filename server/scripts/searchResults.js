#!/usr/bin/env node
// server/scripts/searchResults.js

const mongoose = require('mongoose');
const { connectDB } = require('../config/database');
const { logger } = require('../utils/logger');
const { generateEmbedding, cosineSimilarity } = require('../services/embeddingService');

// Make sure we load all models explicitly before using them
const VisionResult = require('../models/VisionResult');
const Stream = require('../models/Stream');
// Also load any other models used in the population chains

// Set strictQuery to suppress the deprecation warning
mongoose.set('strictQuery', false);

/**
 * Search for recent results matching a keyword
 * @param {string} searchTerm - The keyword to search for
 */
const searchResults = async (searchTerm) => {
  if (!searchTerm) {
    console.error('Usage: node searchResults.js "your search term"');
    process.exit(1);
  }

  try {
    await connectDB();
    logger.info('Connected to MongoDB');
    
    console.log(`\n===== SEARCHING FOR: "${searchTerm}" =====\n`);
    
    // Generate embedding for the search term
    const searchEmbedding = await generateEmbedding(searchTerm);
    
    if (!searchEmbedding) {
      console.error('Could not generate embedding for search term');
    }
    
    // First approach: Using text search (faster but less semantic)
    console.log('===== TEXT-BASED SEARCH RESULTS =====');
    
    try {
      const textResults = await VisionResult.find(
        { $text: { $search: searchTerm } },
        { score: { $meta: "textScore" } }
      )
      .sort({ score: { $meta: "textScore" }, timestamp: -1 })
      .limit(7)
      .populate('streamId', 'name url type location category')
      .lean();
      
      if (textResults.length === 0) {
        console.log('No text-based matches found');
      } else {
        console.log(`Found ${textResults.length} text-based matches`);
        textResults.forEach((result, index) => {
          const date = new Date(result.timestamp).toLocaleString();
          const streamName = result.streamId ? result.streamId.name : 'Unknown';
          const location = result.streamId ? result.streamId.location : 'Unknown';
          
          console.log(`\n--- RESULT ${index + 1} (Text Match) ---`);
          console.log(`Stream: ${streamName}`);
          console.log(`Location: ${location || 'Not specified'}`);
          console.log(`Date: ${date}`);
          console.log(`ID: ${result._id}`);
          console.log('Content:');
          console.log(result.result);
        });
      }
    } catch (err) {
      console.error(`Error during text search: ${err.message}`);
    }
    
    // If we have embeddings, also try semantic search
    if (searchEmbedding) {
      console.log('\n\n===== SEMANTIC SEARCH RESULTS =====');
      
      try {
        // Get results with embeddings
        const candidateResults = await VisionResult.find({
          embedding: { $exists: true, $ne: null }
        })
        .sort({ timestamp: -1 })
        .limit(200) // Get more candidates to filter semantically
        .populate('streamId', 'name url type location category')
        .lean();
        
        if (candidateResults.length === 0) {
          console.log('No documents with embeddings found');
        } else {
          // Calculate similarity for each result
          const resultsWithSimilarity = candidateResults
            .filter(doc => Array.isArray(doc.embedding) && doc.embedding.length > 0)
            .map(doc => {
              const similarity = cosineSimilarity(searchEmbedding, doc.embedding);
              return { ...doc, similarity };
            })
            .filter(doc => doc.similarity > 0.001) // Threshold for similarity
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 10);
          
          if (resultsWithSimilarity.length === 0) {
            console.log('No semantic matches found with similarity above threshold');
          } else {
            console.log(`Found ${resultsWithSimilarity.length} semantic matches`);
            
            resultsWithSimilarity.forEach((result, index) => {
              const date = new Date(result.timestamp).toLocaleString();
              const streamName = result.streamId ? result.streamId.name : 'Unknown';
              const location = result.streamId ? result.streamId.location : 'Unknown';
              
              console.log(`\n--- RESULT ${index + 1} (Similarity: ${result.similarity.toFixed(4)}) ---`);
              console.log(`Stream: ${streamName}`);
              console.log(`Location: ${location || 'Not specified'}`);
              console.log(`Date: ${date}`);
              console.log(`ID: ${result._id}`);
              console.log('Content:');
              console.log(result.result);
            });
          }
        }
      } catch (err) {
        console.error(`Error during semantic search: ${err.message}`);
      }
    }
    
    console.log('\n===== SEARCH COMPLETE =====');
    process.exit(0);
  } catch (err) {
    logger.error(`Error in search script: ${err.message}`);
    process.exit(1);
  }
};

// Get search term from command line arguments
const searchTerm = process.argv[2];
searchResults(searchTerm);