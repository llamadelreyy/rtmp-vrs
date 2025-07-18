// server/services/autoProcessor.js
const { logger } = require('../utils/logger');
const Stream = require('../models/Stream');
const frameCapture = require('./frameCapture');
const frameProcessor = require('./frameProcessor');
const hlsRecorder = require('./hlsRecorder');

class AutoProcessor {
  constructor() {
    this.activeStreams = new Map();
  }
  
  // Start the auto-processor
  async start() {
    try {
      // Find all streams with auto-processing enabled
      const streams = await Stream.find({
        'settings.vision.enabled': true,
        'settings.vision.autoProcessInterval': { $gt: 0 }
      });
      
      logger.info(`Starting auto-processor for ${streams.length} streams`);
      
      // Setup processing for each stream
      streams.forEach(stream => this.setupStreamProcessing(stream));

      // Restart HLS recordings for all active streams
      await hlsRecorder.restartAllActiveRecordings();
    } catch (error) {
      logger.error(`Error starting auto-processor: ${error.message}`);
    }
  }
  
  // Setup auto-processing for a single stream
  setupStreamProcessing(stream) {
    // Skip if already processing
    if (this.activeStreams.has(stream._id.toString())) {
      return;
    }
    
    // Get settings
    const interval = stream.settings.vision.autoProcessInterval * 1000; // Convert to ms
    const promptId = stream.settings.vision.defaultPromptId;
    
    if (!promptId) {
      logger.error(`Stream ${stream._id} has no default promptId, skipping auto-processing`);
      return;
    }
    
    logger.info(`Setting up auto-processing for stream ${stream._id} with interval ${interval}ms`);
    
    // Create an interval
    const timerId = setInterval(async () => {
      try {
        // Skip if stream status is not active
        if (stream.status !== 'active') {
          logger.info(`Stream ${stream._id} is not active, skipping auto-processing`);
          return;
        }
        
        // Capture frame with proper credentials
        let frameBuffer;
        try {
          if (process.env.NODE_ENV === 'production') {
            // Make sure to pass credentials correctly
            frameBuffer = await frameCapture.captureFrame(stream.url, {
              username: stream.credentials?.username, // Correct path
              password: stream.credentials?.password, // Correct path
              timeout: 15000
            });
          } else {
            frameBuffer = await frameCapture.simulateCapture();
          }
        } catch (err) {
          logger.error(`Auto-processing frame capture error for stream ${stream._id}: ${err.message}`);
          return;
        }
        
        if (!frameBuffer) {
          logger.error(`Failed to capture frame for stream ${stream._id}`);
          return;
        }
        
        // Queue the frame for processing
        const jobId = await frameProcessor.queueFrame(
          stream._id.toString(),
          promptId.toString(),
          frameBuffer,
          { cooldown: interval / 1000 / 2 } // Set cooldown to half the interval
        );
        
        if (jobId) {
          logger.info(`Auto-processed frame for stream ${stream._id}, job ${jobId}`);
        }
      } catch (error) {
        logger.error(`Auto-processing error for stream ${stream._id}: ${error.message}`);
      }
    }, interval);
    
    // Store the timer
    this.activeStreams.set(stream._id.toString(), timerId);
  }
  
  // Stop processing for a stream
  stopStreamProcessing(streamId) {
    const id = streamId.toString();
    
    if (this.activeStreams.has(id)) {
      clearInterval(this.activeStreams.get(id));
      this.activeStreams.delete(id);
      logger.info(`Stopped auto-processing for stream ${id}`);
    }
  }
  
// Add this method to handle stream status changes
async updateStreamStatus(streamId, newStatus) {
  try {
    // Get stream information
    const stream = await Stream.findById(streamId);
    if (!stream) {
      logger.error(`Stream ${streamId} not found`);
      return false;
    }
    
    // Handle status change
    if (newStatus === 'active') {
      // Start recording when stream becomes active
      await hlsRecorder.startRecording(
        streamId,
        stream.url,
        {
          username: stream.credentials?.username,
          password: stream.credentials?.password
        }
      );
    } else if (newStatus === 'inactive' || newStatus === 'error') {
      // Stop recording when stream becomes inactive or has an error
      hlsRecorder.stopRecording(streamId);
    }
    
    return true;
  } catch (error) {
    logger.error(`Error updating stream status for ${streamId}: ${error.message}`);
    return false;
  }
}

  // Update stream processing
  async updateStreamProcessing(streamId) {
    try {
      // Get the stream
      const stream = await Stream.findById(streamId);
      
      if (!stream) {
        this.stopStreamProcessing(streamId);
        return;
      }
      
      // Stop existing processing
      this.stopStreamProcessing(streamId);
      
      // Setup new processing if enabled
      if (
        stream.settings.vision.enabled &&
        stream.settings.vision.autoProcessInterval > 0 &&
        stream.settings.vision.defaultPromptId
      ) {
        this.setupStreamProcessing(stream);
      }
    } catch (error) {
      logger.error(`Error updating stream processing for ${streamId}: ${error.message}`);
    }
  }
  
  // Stop all processing
  stop() {
    for (const [streamId, timerId] of this.activeStreams.entries()) {
      clearInterval(timerId);
      logger.info(`Stopped auto-processing for stream ${streamId}`);
    }
    
    this.activeStreams.clear();

    // Stop all HLS recordings
  hlsRecorder.stopAllRecordings();
  
    logger.info('Auto-processor stopped');
  }
}

module.exports = new AutoProcessor();