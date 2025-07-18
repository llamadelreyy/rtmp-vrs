// server/services/threadManager.js - Fixed version

const { logger } = require('../utils/logger');
const ThreadState = require('../models/ThreadState');
const frameProcessor = require('./frameProcessor');
const Stream = require('../models/Stream');
const Prompt = require('../models/Prompt');
const { v4: uuidv4 } = require('uuid');

// Store active interval references
const activeThreads = new Map();

class ThreadManager {
  constructor() {
    logger.info('Thread Manager initialized');
  }

  async start() {
    logger.info('Starting Thread Manager');
    
    try {
      // Recover any threads that were running before server restart
      const runningThreads = await ThreadState.find({ active: true });
      logger.info(`Found ${runningThreads.length} previously active threads`);
      
      // Restart each thread
      for (const thread of runningThreads) {
        try {
          await this.restartThread(thread.threadId);
          logger.info(`Restarted thread ${thread.threadId}`);
        } catch (error) {
          logger.error(`Failed to restart thread ${thread.threadId}: ${error.message}`);
          
          // Update thread state to inactive if we can't restart it
          thread.active = false;
          thread.errorCount += 1;
          await thread.save();
        }
      }
      
      logger.info('Thread Manager started successfully');
    } catch (error) {
      logger.error(`Error starting Thread Manager: ${error.message}`);
      throw error;
    }
  }
  
  async restartThread(threadId) {
    try {
      // Get thread state from database
      const threadState = await ThreadState.findOne({ threadId });
      
      if (!threadState) {
        throw new Error(`Thread ${threadId} not found`);
      }
      
      // Verify stream and prompt still exist
      const [stream, prompt] = await Promise.all([
        Stream.findById(threadState.streamId),
        Prompt.findById(threadState.promptId)
      ]);
      
      if (!stream || !prompt) {
        throw new Error('Associated stream or prompt no longer exists');
      }
      
      // Start the thread processing loop
      await this._startProcessingLoop(threadId, threadState.streamId, threadState.promptId);
      
      return true;
    } catch (error) {
      logger.error(`Error restarting thread ${threadId}: ${error.message}`);
      throw error;
    }
  }

  async startThread(streamId, promptId) {
    try {
      // Verify stream and prompt exist
      const [stream, prompt] = await Promise.all([
        Stream.findById(streamId),
        Prompt.findById(promptId)
      ]);
      
      if (!stream) {
        throw new Error('Stream not found');
      }
      
      if (!prompt) {
        throw new Error('Prompt not found');
      }
      
      // Generate a unique thread ID
      const threadId = uuidv4();
      
      // Create thread state in database
      const threadState = new ThreadState({
        threadId,
        streamId,
        promptId,
        active: true,
        lastProcessed: null,
        errorCount: 0
      });
      
      await threadState.save();
      
      // Start the thread processing loop
      await this._startProcessingLoop(threadId, streamId, promptId);
      
      logger.info(`Started thread ${threadId} for stream ${streamId} with prompt ${promptId}`);
      
      return threadId;
    } catch (error) {
      logger.error(`Error starting thread: ${error.message}`);
      throw error;
    }
  }
  
  async stopThread(threadId) {
    try {
      // Stop the interval
      if (activeThreads.has(threadId)) {
        clearInterval(activeThreads.get(threadId));
        activeThreads.delete(threadId);
        logger.info(`Stopped processing loop for thread ${threadId}`);
      }
      
      // Update thread state in database
      const threadState = await ThreadState.findOne({ threadId });
      
      if (!threadState) {
        logger.warn(`Thread ${threadId} not found in database`);
        return false;
      }
      
      threadState.active = false;
      await threadState.save();
      
      logger.info(`Stopped thread ${threadId}`);
      
      return true;
    } catch (error) {
      logger.error(`Error stopping thread ${threadId}: ${error.message}`);
      throw error;
    }
  }
  
  async stopAllThreads() {
    try {
      // Stop all interval timers
      for (const [threadId, interval] of activeThreads.entries()) {
        clearInterval(interval);
        logger.info(`Stopped processing loop for thread ${threadId}`);
      }
      
      // Clear the map
      activeThreads.clear();
      
      // Update all thread states in database
      await ThreadState.updateMany(
        { active: true },
        { $set: { active: false } }
      );
      
      logger.info('Stopped all threads');
      
      return true;
    } catch (error) {
      logger.error(`Error stopping all threads: ${error.message}`);
      throw error;
    }
  }
  
  async getThreadsStatus() {
    try {
      // Get all thread states from database - add error handling for the populate
      let threadStates;
      try {
        threadStates = await ThreadState.find().populate('streamId promptId');
      } catch (err) {
        logger.error(`Error populating thread states: ${err.message}`);
        // Fallback to just getting the thread states without population
        threadStates = await ThreadState.find();
      }
      
      // Transform to a more client-friendly format with additional error handling
      const threads = threadStates.map(thread => {
        // Handle cases where population might have failed
        const streamName = thread.streamId && typeof thread.streamId !== 'string' ? thread.streamId.name : 'Unknown Stream';
        const promptName = thread.promptId && typeof thread.promptId !== 'string' ? thread.promptId.name : 'Unknown Prompt';
        
        return {
          id: thread.threadId,
          streamId: thread.streamId && typeof thread.streamId !== 'string' ? thread.streamId._id : thread.streamId,
          streamName: streamName,
          promptId: thread.promptId && typeof thread.promptId !== 'string' ? thread.promptId._id : thread.promptId,
          promptName: promptName,
          active: thread.active,
          lastProcessed: thread.lastProcessed,
          errorCount: thread.errorCount,
          createdAt: thread.createdAt
        };
      });
      
      return {
        count: threads.length,
        activeCount: threads.filter(t => t.active).length,
        threads
      };
    } catch (error) {
      logger.error(`Error getting thread status: ${error.message}`);
      // Return a default response to prevent client errors
      return {
        count: 0,
        activeCount: 0,
        threads: [],
        error: error.message
      };
    }
  }
  
  async _startProcessingLoop(threadId, streamId, promptId) {
    try {
      // Get the stream to check for processing interval
      const stream = await Stream.findById(streamId);
      
      if (!stream) {
        throw new Error('Stream not found');
      }
      
      // Default to 30 seconds if not specified or invalid
      let processingInterval = 30;
      
      try {
        // Safely access nested properties
        if (stream.settings && 
            stream.settings.vision && 
            typeof stream.settings.vision.autoProcessInterval === 'number') {
          processingInterval = stream.settings.vision.autoProcessInterval;
        }
      } catch (error) {
        logger.warn(`Invalid processing interval for stream ${streamId}, using default: ${error.message}`);
      }
      
      // Don't allow intervals less than 10 seconds
      const safeInterval = Math.max(processingInterval, 10) * 1000;
      
      logger.info(`Starting processing loop for thread ${threadId} with interval ${safeInterval}ms`);
      
      // Stop existing interval if it exists
      if (activeThreads.has(threadId)) {
        clearInterval(activeThreads.get(threadId));
      }
      
      // Start a new interval with proper error handling
      const interval = setInterval(async () => {
        try {
          // Process a frame
          await this._processFrame(threadId, streamId, promptId);
        } catch (error) {
          logger.error(`Error in processing loop for thread ${threadId}: ${error.message}`);
          
          // Update error count in thread state
          try {
            const threadState = await ThreadState.findOne({ threadId });
            if (threadState) {
              threadState.errorCount = (threadState.errorCount || 0) + 1;
              await threadState.save();
              
              // If too many consecutive errors, consider stopping the thread
              if (threadState.errorCount >= 5) {
                logger.warn(`Thread ${threadId} has ${threadState.errorCount} errors, considering stopping`);
                // Optionally implement auto-stop logic here
              }
            }
          } catch (dbError) {
            logger.error(`Error updating thread state: ${dbError.message}`);
          }
        }
      }, safeInterval);
      
      // Store the interval reference
      activeThreads.set(threadId, interval);
      
      // Process a frame immediately with error handling
      try {
        await this._processFrame(threadId, streamId, promptId);
      } catch (immediateError) {
        logger.error(`Error in immediate frame processing for thread ${threadId}: ${immediateError.message}`);
      }
      
      return true;
    } catch (error) {
      logger.error(`Error starting processing loop for thread ${threadId}: ${error.message}`);
      throw error;
    }
  }
  
  async _processFrame(threadId, streamId, promptId) {
    try {
      logger.debug(`Processing frame for thread ${threadId}`);
      
      // Get stream with credentials
      const stream = await Stream.findById(streamId);
      if (!stream) {
        throw new Error(`Stream ${streamId} not found`);
      }
      
      // Queue a frame for processing with proper credentials
      const jobId = await frameProcessor.queueFrame(streamId, promptId, {
        forceProcess: false,
        priority: 10,
        // Include stream credentials correctly
        username: stream.credentials?.username,
        password: stream.credentials?.password,
        timeout: 15000,
        streamId: streamId
      });
      
      logger.debug(`Queued frame for thread ${threadId}, job ID: ${jobId || 'skipped'}`);
      
      // Update the last processed time
      if (jobId) {
        await ThreadState.findOneAndUpdate(
          { threadId },
          { lastProcessed: new Date() }
        );
      }
      
      return jobId;
    } catch (error) {
      logger.error(`Error processing frame for thread ${threadId}: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new ThreadManager();