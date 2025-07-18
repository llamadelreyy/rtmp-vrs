// server/services/frameProcessor.js
const { logger } = require('../utils/logger');
const visionProcessor = require('./visionProcessor');
const VisionResult = require('../models/VisionResult');
const Stream = require('../models/Stream');
const Prompt = require('../models/Prompt');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const Queue = require('bull');
const sharp = require('sharp'); // Using sharp for image processing instead of OpenCV
const frameCapture = require('./frameCapture');
const embeddingService = require('./embeddingService');

// In frameProcessor.js, update this:
const { createBullRedisClient } = require('../config/redis');
const {
  broadcastNewStream,
  broadcastStreamPromptEvent,
} = require('../websocket/handlers');
const { getIO } = require('../websocket/server');
const frameQueue = new Queue('frame-processing', {
  createClient: function (type) {
    return createBullRedisClient();
  },
});

// Store last processing time for each stream
const lastProcessedTime = {};
// Store last frame hash for each stream to detect changes
const lastFrameHash = {};
// Default cooldown in seconds
const DEFAULT_COOLDOWN = 10;

class FrameProcessor {
  constructor() {
    // Log when the processor is being created
    logger.info('Initializing FrameProcessor...');

    // Make sure Redis is connected
    const redisClient = require('../config/redis').getRedisClient();
    redisClient.ping().then(
      () => logger.info('Redis connection confirmed'),
      (err) => logger.error(`Redis connection error: ${err.message}`)
    );

    this.setupQueueProcessor();
    this.clearAllJobs();

    // Add a global error handler
    frameQueue.on('error', (error) => {
      logger.error(`Queue error: ${error.message}`);
    });

    // Check that the queue is properly set up
    frameQueue.isReady().then(
      () => logger.info('Frame queue is ready to process jobs'),
      (err) => logger.error(`Frame queue not ready: ${err.message}`)
    );
  }

  // Add this new method
  async clearAllJobs() {
    try {
      logger.info(
        'Clearing all jobs from the frame processing queue on startup...'
      );

      // Get counts before clearing
      const [waiting, active, delayed, completed, failed] = await Promise.all([
        frameQueue.getWaitingCount(),
        frameQueue.getActiveCount(),
        frameQueue.getDelayedCount(),
        frameQueue.getCompletedCount(),
        frameQueue.getFailedCount(),
      ]);

      logger.info(
        `Queue status before clearing - Waiting: ${waiting}, Active: ${active}, Delayed: ${delayed}, Completed: ${completed}, Failed: ${failed}`
      );

      // Clear all jobs from the queue
      await frameQueue.empty();

      // Verify the queue is empty
      const totalAfter = await frameQueue.count();
      logger.info(`Queue cleared. Remaining jobs: ${totalAfter}`);

      return true;
    } catch (error) {
      logger.error(`Error clearing jobs: ${error.message}`);
      return false;
    }
  }

  // In the setupQueueProcessor method, update the process call:
  setupQueueProcessor() {
    // Set a timeout option for jobs, but fix the concurrency issue
    frameQueue.process(async (job) => {
      logger.info(
        `Starting to process job ${job.id} for stream ${job.data.streamId}`
      );

      try {
        const { streamId, promptId, frameBase64, options } = job.data;

        // Convert base64 string back to buffer
        if (!frameBase64 || typeof frameBase64 !== 'string') {
          logger.error(
            `Job ${job.id
            } received invalid base64 string: ${typeof frameBase64}`
          );
          throw new Error('Invalid base64 string received from queue');
        }

        // Convert base64 string back to Buffer
        const frameBuffer = Buffer.from(frameBase64, 'base64');
        logger.info(
          `Converted base64 back to buffer (${frameBuffer.length} bytes)`
        );

        const startTime = Date.now();
        const result = await this.processFrameWithAPI(
          streamId,
          promptId,
          frameBuffer,
          options
        );
        const processingTime = Date.now() - startTime;

        logger.info(
          `Processed frame for stream ${streamId} in ${processingTime}ms`
        );

        // Save result to database
        await this.saveResult(
          streamId,
          promptId,
          result,
          processingTime,
          frameBuffer
        );

        // Update last processed time for this stream
        lastProcessedTime[streamId] = Date.now();

        return result;
      } catch (error) {
        logger.error(`Error processing job ${job.id}: ${error.stack}`);
        throw error;
      }
    });

    // Add handlers for job events
    frameQueue.on('completed', (job, result) => {
      logger.info(`Job ${job.id} completed for stream ${job.data.streamId}`);
    });

    frameQueue.on('failed', (job, error) => {
      logger.error(
        `Job ${job.id} failed for stream ${job.data.streamId}: ${error.message}`
      );
    });

    frameQueue.on('active', (job) => {
      logger.info(
        `Job ${job.id} for stream ${job.data.streamId} has started processing`
      );
    });

    // Add a specific handler for timeouts
    frameQueue.on('stalled', async (job) => {
      logger.warn(
        `Job ${job.id} for stream ${job.data.streamId} stalled (timed out)`
      );

      try {
        // Remove the job from the queue
        await job.remove();
        logger.info(`Removed stalled job ${job.id} from the queue`);
      } catch (err) {
        logger.error(`Error removing stalled job ${job.id}: ${err.message}`);
      }
    });
  }

  // Check if the frame is significantly different from the last one using image comparison
  async isSignificantFrame(streamId, frameBuffer, threshold = 1.5) {
    try {
      // Use sharp to resize and get raw pixel data instead of encoded buffer
      const smallImage = await sharp(frameBuffer)
        .resize(64, 64, { fit: 'fill' })
        .grayscale()
        .raw() // Extract raw pixel data
        .toBuffer();

      // If no previous frame for this stream, this is significant
      if (!lastFrameHash[streamId]) {
        console.debug(
          `[Frame Comparison] No previous frame for stream ${streamId}, considering as significant`
        );
        lastFrameHash[streamId] = smallImage;
        return true;
      }

      // Compare pixel values with previous frame
      const prevSmallImage = lastFrameHash[streamId];

      // This should no longer be an issue since raw buffers will be consistent size
      if (smallImage.length !== prevSmallImage.length) {
        console.warn(
          `[Frame Comparison] Buffer length mismatch for stream ${streamId}: current=${smallImage.length}, prev=${prevSmallImage.length}`
        );
        lastFrameHash[streamId] = smallImage;
        return true;
      }

      // Rest of the function remains the same...
      let diff = 0;
      for (let i = 0; i < smallImage.length; i++) {
        diff += Math.abs(smallImage[i] - prevSmallImage[i]);
      }

      const maxPossibleDiff = smallImage.length * 255;
      const percentDiff = (diff / maxPossibleDiff) * 100;

      lastFrameHash[streamId] = smallImage;

      console.debug(
        `[Frame Comparison] Stream ${streamId}: Analyzed frame (${smallImage.length} bytes)`
      );
      console.info(
        `[Frame Comparison] Frame difference for stream ${streamId}: ${percentDiff.toFixed(
          2
        )}% (threshold: ${threshold}%)`
      );

      const isSignificant = percentDiff >= threshold;
      console.debug(
        `[Frame Comparison] Stream ${streamId}: Frame is ${isSignificant ? 'significant' : 'not significant'
        }`
      );

      return isSignificant;
    } catch (error) {
      console.error(
        `[Frame Comparison] Error checking frame significance for stream ${streamId}: ${error.message}`
      );
      return true; // Default to true on error to ensure processing continues
    }
  }

  // Then modify the queueFrame method to capture the frame from the stream
  async queueFrame(streamId, promptId, options = {}) {
    try {
      // Get stream and prompt information
      const stream = await Stream.findById(streamId);
      const prompt = await Prompt.findById(promptId);

      if (!stream || !prompt) {
        throw new Error('Stream or prompt not found');
      }

      // Check cooldown period
      const cooldown = options.cooldown || DEFAULT_COOLDOWN;
      const now = Date.now();
      const lastTime = lastProcessedTime[streamId] || 0;
      const timeSinceLastProcess = (now - lastTime) / 1000; // in seconds

      if (timeSinceLastProcess < cooldown) {
        logger.info(
          `Skipping frame for stream ${streamId}, in cooldown (${timeSinceLastProcess.toFixed(
            1
          )}s < ${cooldown}s)`
        );
        return null;
      }

      // Capture the frame directly from the stream
      logger.info(`Capturing frame from stream ${streamId} (${stream.url})`);
      const frameBuffer = await frameCapture.captureFrame(stream.url, {
        username: stream.credentials?.username, // Access correct path in the object
        password: stream.credentials?.password, // Access correct path in the object
        timeout: options.timeout || 15000,
        streamId: streamId
      });

      // Verify we have a valid buffer
      if (!Buffer.isBuffer(frameBuffer)) {
        throw new Error('Invalid frame buffer captured from stream');
      }

      logger.info(
        `Successfully captured frame from stream ${streamId} (${frameBuffer.length} bytes)`
      );

      // Check if frame is significant
      const isSignificant = await this.isSignificantFrame(
        streamId,
        frameBuffer
      );
      if (!isSignificant && !options.forceProcess) {
        logger.info(`Skipping non-significant frame for stream ${streamId}`);
        return null;
      }

      // Convert Buffer to base64 string for redis serialization
      const frameBase64 = frameBuffer.toString('base64');
      logger.info(
        `Converted buffer to base64 for queueing (${frameBuffer.length} bytes)`
      );

      // Add to queue with appropriate priority and timeout settings
      const job = await frameQueue.add(
        {
          streamId,
          promptId,
          frameBase64, // Store as base64 string instead of Buffer
          options,
        },
        {
          priority: options.priority || 10,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          timeout: options.timeout || 60000, // Default 60 second timeout
          removeOnComplete: true, // Remove job from queue when complete
          removeOnFail: true, // Remove job from queue when failed
        }
      );

      logger.info(`Queued frame for stream ${streamId} with job ID ${job.id}`);
      return job.id;
    } catch (error) {
      logger.error(`Error queueing frame: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process a frame with the Vision API using a specified prompt
   */
  async processFrameWithAPI(streamId, promptId, frameBuffer, options = {}) {
    try {
      // Get prompt content
      const prompt = await Prompt.findById(promptId);
      if (!prompt) {
        throw new Error(`Prompt ${promptId} not found`);
      }

      // Convert buffer to base64
      const base64Image = frameBuffer.toString('base64');

      // Send to OpenAI API
      const apiResult = await visionProcessor.processImage(
        base64Image,
        prompt.content
      );

      // Important: Handle both string and object content formats
      // and preserve the original frame buffer in the result
      return {
        content: apiResult.content, // Could now be a JSON object or string
        usage: apiResult.usage,
        imageBuffer: frameBuffer // Make sure frameBuffer is passed through correctly
      };
    } catch (error) {
      logger.error(`Error in OpenAI processing: ${error.message}`);
      throw error;
    }
  }

  async saveResult(streamId, promptId, result, processingTime, frameBuffer) {
    try {
      // Generate current date in YYYYMMDD format for subfolder
      const now = new Date();
      const dateFolder = now.getFullYear().toString() +
        (now.getMonth() + 1).toString().padStart(2, '0') +
        now.getDate().toString().padStart(2, '0');
  
      // Generate a filename for the image
      const timestamp = Date.now();
      const filename = `${timestamp}.jpg`;
  
      // Create path structure: captures/streamId/YYYYMMDD/timestamp.jpg
      const relativePath = path.join('captures', streamId, dateFolder);
      const fullDir = path.join(__dirname, '..', 'public', relativePath);
      const imagePath = path.join(fullDir, filename);
  
      // Ensure directory exists (create parent directories recursively)
      await fs.mkdir(fullDir, { recursive: true });
  
      logger.info(
        `Saving image to ${imagePath}, buffer size: ${frameBuffer.length} bytes`
      );
  
      // Explicitly preserve color by setting grayscale to false
      await sharp(frameBuffer).jpeg({ quality: 90 }).toFile(imagePath);
  
      logger.info(`Successfully saved image file to disk`);
  
      // Handle content that could be either a string or a parsed JSON object
      let stringResponse = '';
      let detections = null;
  
      if (result.content) {
        if (typeof result.content === 'string') {
          // Content is a string
          stringResponse = result.content;
          // Try to parse as JSON
          try {
            detections = JSON.parse(result.content);
          } catch (e) {
            // Not JSON, leave detections as null
          }
        } else if (typeof result.content === 'object') {
          // Content is an object (parsed JSON)
          detections = result.content;
          // If there's a description field, use it as string response
          if (result.content.description) {
            stringResponse = result.content.description;
          } else {
            // If no description, stringify the object for text response
            stringResponse = JSON.stringify(result.content);
          }
        }
      }
  
      // Map gun and theft to intrusion
      if (detections) {
        // Create a properly structured detections object that matches our schema
        const structuredDetections = {
          fire: !!detections.fire,
          intrusion: !!(detections.theft || detections.gun), // Map theft or gun to intrusion
          medical: !!detections.medical
        };
        
        // Replace the raw detections with our structured version
        detections = structuredDetections;
      }
  
      // Store the relative path to the image in the database
      const imageUrl = `/${relativePath}/${filename}`;
  
      // Add code to get current HLS recording information
      const hlsRecorder = require('./hlsRecorder');
      let recordingFolder = null;
  
      // Get the current recording folder if available
      if (hlsRecorder.activeRecordings.has(streamId)) {
        const recordingInfo = hlsRecorder.activeRecordings.get(streamId);
        if (recordingInfo && recordingInfo.segmentDir) {
          // Extract just the folder name from the full path
          recordingFolder = path.basename(recordingInfo.segmentDir);
          logger.info(`Found active recording folder: ${recordingFolder} for stream ${streamId}`);
        }
      }
  
      // Generate embedding for the result text
      let embedding = null;
      try {
        if (stringResponse && stringResponse.length > 0) {
          logger.info(`Generating embedding for vision result text (${stringResponse.length} chars)`);
          embedding = await embeddingService.generateEmbedding(stringResponse);
          logger.info(`Successfully generated embedding with ${embedding ? embedding.length : 0} dimensions`);
        }
      } catch (embeddingError) {
        logger.error(`Error generating embedding: ${embeddingError.message}`);
        // Continue without the embedding
      }
  
      const visionResult = new VisionResult({
        streamId,
        promptId,
        result: stringResponse,
        embedding, // Add the embedding field
        detections, //  Change from direct API response to structured detections
        imageUrl: imageUrl,
        processingTime,
        tokenCount: result.usage?.total_tokens || 0,
        timestamp: new Date(),
        metadata: {
          prompt_tokens: result.usage?.prompt_tokens,
          completion_tokens: result.usage?.completion_tokens,
          recordingFolder: recordingFolder,  // Store the recording folder
          captureTimestamp: new Date()       // When the frame was captured
        },
      });
  
      await visionResult.save();
      logger.info(`Saved vision result for stream ${streamId}`);
  
      const globalIo = getIO();
      if (globalIo) {
        broadcastStreamPromptEvent(globalIo, streamId, promptId, visionResult);
      }
  
      return visionResult;
    } catch (error) {
      logger.error(`Error saving vision result: ${error.message}`, {
        stack: error.stack,
      });
  
      // Instead of throwing error, return a partial result without the image
      // Note: We're not generating an embedding for the error case
      const visionResult = new VisionResult({
        streamId,
        promptId,
        result: typeof result.content === 'string' ? result.content :
          (result.content?.description || JSON.stringify(result.content)),
        detections: null,
        imageUrl: null, // No image saved
        processingTime,
        tokenCount: result.usage?.total_tokens || 0,
        timestamp: new Date(),
        metadata: {
          prompt_tokens: result.usage?.prompt_tokens,
          completion_tokens: result.usage?.completion_tokens,
          error: 'Failed to save image: ' + error.message,
        },
      });
  
      try {
        await visionResult.save();
        logger.info(`Saved vision result without image for stream ${streamId}`);
        return visionResult;
      } catch (saveError) {
        logger.error(
          `Failed to save vision result to database: ${saveError.message}`
        );
        return null;
      }
    }
  }


  
  // Get queue status
  async getQueueStatus() {
    try {
      const jobs = await frameQueue.getJobs([
        'waiting',
        'active',
        'completed',
        'failed',
      ]);
      logger.debug(`Queue contains ${jobs.length} total jobs`);

      const [waiting, active, completed, failed] = await Promise.all([
        frameQueue.getWaitingCount(),
        frameQueue.getActiveCount(),
        frameQueue.getCompletedCount(),
        frameQueue.getFailedCount(),
      ]);

      logger.debug(
        `Queue counts - Waiting: ${waiting}, Active: ${active}, Completed: ${completed}, Failed: ${failed}`
      );

      return {
        waiting,
        active,
        completed,
        failed,
        total: waiting + active + completed + failed,
      };
    } catch (error) {
      logger.error(`Error getting queue status: ${error.message}`);
      return { error: error.message };
    }
  }
}

module.exports = new FrameProcessor();
