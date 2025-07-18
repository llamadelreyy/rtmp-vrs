// server/services/hlsRecorder.js
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const { existsSync, mkdirSync } = require('fs');
const { logger } = require('../utils/logger');
const Stream = require('../models/Stream');

class HlsRecorder {
  constructor() {
    this.activeRecordings = new Map(); // Map of streamId -> recording info object
    this.baseDir = path.join(__dirname, '..', 'public', 'captures');

    // Create base directory if it doesn't exist
    if (!existsSync(this.baseDir)) {
      mkdirSync(this.baseDir, { recursive: true });
    }

    // Set up periodic health check
    this.healthCheckInterval = setInterval(() => this.checkRecordingsHealth(), 30000); // Every 30 seconds
  }

  /**
   * Start recording a stream to HLS format
   * @param {string} streamId - The ID of the stream to record
   * @param {string} streamUrl - The RTSP URL of the stream
   * @param {Object} options - Recording options including credentials
   * @returns {Promise<boolean>} - Whether the recording was started successfully
   */
  async startRecording(streamId, streamUrl, options = {}) {
    try {
      // Skip if already recording
      if (this.activeRecordings.has(streamId)) {
        logger.info(`Stream ${streamId} already being recorded`);
        return true;
      }

      // Create stream directory
      const streamDir = path.join(this.baseDir, streamId, 'HLS');
      await fs.mkdir(streamDir, { recursive: true });

      // Generate unique segment name based on timestamp
      const timestamp = Date.now();
      const segmentDir = path.join(streamDir, `recording_${timestamp}`);
      await fs.mkdir(segmentDir, { recursive: true });

      // Create an initial metadata file to mark the start of recording
      // This helps ensure we have a record even if ffmpeg crashes before completing
      await this._createRecordingMetadata(streamId, segmentDir, {
        start: timestamp,
        end: null, // Will be updated when recording ends
        exitCode: null,
        reason: 'started'
      });

      // Create m3u8 playlist file
      const playlistPath = path.join(segmentDir, 'playlist.m3u8');

      // Prepare ffmpeg arguments
      let args = [
        '-y',                       // Overwrite output files without asking
        '-loglevel', 'error',       // Only show errors to keep logs clean
      ];

      // Add credentials if provided
      if (options.username && options.password) {
        // For RTSP, credentials need to be in the URL
        if (streamUrl.startsWith('rtsp://') && !streamUrl.includes('@')) {
          const urlObj = new URL(streamUrl);
          urlObj.username = options.username;
          urlObj.password = options.password;
          streamUrl = urlObj.toString();
        }
      }

      // Add RTSP-specific options
      if (streamUrl.startsWith('rtsp://')) {
        args.push('-rtsp_transport', 'tcp');
      }

      // Inside startRecording method - update the args array:
      args = args.concat([
        '-i', streamUrl,

        // Improved video codec settings
        '-c:v', 'libx264',
        '-preset', 'ultrafast',     // Changed from 'fast' to 'ultrafast' for lower latency
        '-tune', 'zerolatency',     // Added to reduce latency
        '-crf', '23',               // Higher CRF value = lower quality but smaller file size

        // Audio codec settings
        '-c:a', 'aac',
        '-b:a', '128k',            // Reduced from 128k to 64k for smaller file size
        '-ac', '2',                // Added to ensure 2 audio channels

        // Updated HLS specific settings for better playback
        '-hls_time', '4',          // Changed from 10 to 2 seconds for lower latency // Increased to 4 slightly for better compression efficiency
        '-hls_list_size', '0',   // Keep approximately 5 minutes (150 × 2 seconds)  // Value of 0 means keep all segments in the playlist
        '-hls_flags', 'delete_segments+append_list+program_date_time',
        //'-hls_segment_type', 'mpegts',
        //'-hls_delete_threshold', '1', // Delete segments as soon as they're not in the list
        '-hls_segment_filename', path.join(segmentDir, 'segment_%03d.ts'),

        // Set size limit (still keep 20GB)
        //'-fs', '20971520000', // size limit

        // Set time limit (8 hours)
        //'-t', '28800', // time limit

        // Output
        playlistPath
      ]);

      // Log the command (hiding credentials)
      const logArgs = [...args];
      const inputIndex = logArgs.indexOf('-i');
      if (inputIndex > -1 && inputIndex + 1 < logArgs.length) {
        logArgs[inputIndex + 1] = logArgs[inputIndex + 1].replace(/\/\/(.*):(.*)@/, '//***:***@');
      }
      logger.info(`Starting HLS recording for stream ${streamId} with command: ffmpeg ${logArgs.join(' ')}`);
      logger.info(`HLS recording started for stream ${streamId}. Playlist path: ${playlistPath}`);
      logger.info(`Recording segments will be saved to: ${segmentDir}`);
      
      // Start ffmpeg process
      const ffmpeg = spawn('ffmpeg', args, {
        stdio: ['pipe', 'pipe', 'pipe'] // stdin, stdout, stderr
      });

      // Store process reference and metadata
      this.activeRecordings.set(streamId, {
        process: ffmpeg,
        startTime: timestamp,
        url: streamUrl,
        segmentDir,
        options,
        lastHealthCheck: Date.now()
      });

      // Handle ffmpeg logs
      ffmpeg.stderr.on('data', (data) => {
        const info = this.activeRecordings.get(streamId);
        if (info) {
          info.lastHealthCheck = Date.now(); // Update last activity time
        }
        logger.debug(`HLS recorder (${streamId}): ${data.toString().trim()}`);
      });

      // Handle process exit
      ffmpeg.on('close', async (code) => {
        const recordingInfo = this.activeRecordings.get(streamId);
        if (!recordingInfo) return;

        // Ensure playlist is finalized
        const playlistPath = path.join(recordingInfo.segmentDir, 'playlist.m3u8');
        await this._finalizePlaylist(playlistPath);

        // IMPORTANT: Create metadata file BEFORE removing from active recordings
        // This ensures the recording info is properly saved
        await this._createRecordingMetadata(streamId, recordingInfo.segmentDir, {
          start: recordingInfo.startTime,
          end: Date.now(),
          exitCode: code,
          reason: code === 0 ? 'completed' : 'error'
        }).catch(err => {
          logger.error(`Failed to create recording metadata: ${err.message}`);
        });

        // Store the URL and options before removing from active recordings
        const previousUrl = recordingInfo.url;
        const previousOptions = recordingInfo.options;

        // Remove this process from active recordings
        this.activeRecordings.delete(streamId);

        if (code === 0) {
          logger.info(`HLS recording for stream ${streamId} completed successfully (reached limit)`);

          // Start a new recording since this one ended normally (reached limit)
          logger.info(`Starting new recording for stream ${streamId} after previous recording reached limit`);
          this.startRecording(streamId, previousUrl, previousOptions)
            .catch(err => logger.error(`Failed to start new recording for ${streamId}: ${err.message}`));
        } else {
          logger.error(`HLS recording for stream ${streamId} exited with code ${code}`);

          // If exit was unexpected and stream should be active, restart the recording
          try {
            const stream = await Stream.findById(streamId);
            if (stream && stream.status === 'active') {
              logger.info(`Attempting to restart recording for stream ${streamId} after unexpected exit`);
              // Wait a few seconds before restarting to avoid rapid restart cycles
              setTimeout(() => {
                this.startRecording(streamId, previousUrl, previousOptions)
                  .catch(err => logger.error(`Failed to restart recording for ${streamId}: ${err.message}`));
              }, 5000);
            }
          } catch (err) {
            logger.error(`Error checking stream status after recording failure: ${err.message}`);
          }
        }
      });

      // Handle errors
      ffmpeg.on('error', (err) => {
        logger.error(`HLS recorder error for stream ${streamId}: ${err.message}`);
        this.activeRecordings.delete(streamId);
      });

      return true;
    } catch (error) {
      logger.error(`Failed to start HLS recording for stream ${streamId}: ${error.message}`);
      return false;
    }
  }

  async _finalizePlaylist(playlistPath) {
    try {
      // Read the current playlist
      const content = await fs.readFile(playlistPath, 'utf8');

      // Check if #EXT-X-ENDLIST already exists
      if (!content.includes('#EXT-X-ENDLIST')) {
        // Append the ENDLIST tag
        await fs.writeFile(playlistPath, content + '\n#EXT-X-ENDLIST\n');
        logger.debug(`Finalized playlist at ${playlistPath}`);
      }
    } catch (error) {
      logger.error(`Failed to finalize playlist at ${playlistPath}: ${error.message}`);
    }
  }

  /**
   * Find the recording folder that contains a specific timestamp
   * @param {string} streamId - The ID of the stream
   * @param {string|number} timestamp - The timestamp to find (ISO string or milliseconds)
   * @returns {Promise<string|null>} - The folder name or null if not found
   */
  async getRecordingFolderForTimestamp(streamId, timestamp) {
    try {
      const baseDir = path.join(this.baseDir, streamId, 'HLS');
      if (!existsSync(baseDir)) {
        logger.debug(`Base directory does not exist: ${baseDir}`);
        return null;
      }
      
      // Get all recording directories
      const dirs = await fs.readdir(baseDir);
      
      // Convert timestamp to milliseconds if it's not already
      const targetTime = typeof timestamp === 'string' && timestamp.includes('-') 
        ? new Date(timestamp).getTime() 
        : parseInt(timestamp);
      
      // First check: Is there an active recording that includes this timestamp?
      const activeRecording = this.activeRecordings.get(streamId);
      if (activeRecording && activeRecording.startTime <= targetTime) {
        return path.basename(activeRecording.segmentDir);
      }
      
      // Second check: Find recordings with metadata
      for (const dir of dirs) {
        const metadataPath = path.join(baseDir, dir, 'recording_info.json');
        
        if (existsSync(metadataPath)) {
          try {
            const metadataContent = await fs.readFile(metadataPath, 'utf8');
            const metadata = JSON.parse(metadataContent);
            
            // If end is null (recording was interrupted), use current time
            const start = metadata.start;
            const end = metadata.end || Date.now();
            
            if (targetTime >= start && targetTime <= end) {
              logger.info(`Found matching recording folder ${dir} for timestamp ${new Date(targetTime).toISOString()}`);
              return dir;
            }
          } catch (err) {
            // Continue to next directory if this one has issues
            logger.error(`Error reading metadata for ${dir}: ${err.message}`);
            continue;
          }
        }
      }
      
      // Fallback: Use folder timestamp as an approximation
      const timestampedDirs = dirs.map(dir => {
        const dirTimestamp = parseInt(dir.split('_')[1] || '0');
        return { dir, timestamp: dirTimestamp };
      }).filter(item => item.timestamp > 0);
      
      // Sort by timestamp (newest first)
      timestampedDirs.sort((a, b) => b.timestamp - a.timestamp);
      
      // Find the most recent directory that started before our target time
      for (const item of timestampedDirs) {
        if (item.timestamp <= targetTime) {
          logger.info(`Found approximate recording folder ${item.dir} for timestamp ${new Date(targetTime).toISOString()} based on folder name`);
          return item.dir;
        }
      }
      
      // Last resort: return the most recent directory
      if (timestampedDirs.length > 0) {
        logger.info(`No exact match found, returning newest recording folder: ${timestampedDirs[0].dir}`);
        return timestampedDirs[0].dir;
      }
      
      logger.warn(`No recording folder found for stream ${streamId} and timestamp ${new Date(targetTime).toISOString()}`);
      return null;
    } catch (error) {
      logger.error(`Error finding recording folder for timestamp: ${error.message}`);
      return null;
    }
  }

  /**
   * Stop recording a stream
   * @param {string} streamId - The ID of the stream to stop recording
   * @returns {Promise<boolean>} - Whether the recording was stopped
   */
  stopRecording(streamId) {
    return new Promise((resolve) => {
      const recordingInfo = this.activeRecordings.get(streamId);

      if (recordingInfo && recordingInfo.process) {
        logger.info(`Gracefully stopping HLS recording for stream ${streamId}...`);

        // Set up a flag to track whether the process exited gracefully
        let hasExited = false;

        // First try sending 'q' command through stdin (most graceful method)
        if (recordingInfo.process.stdin) {
          try {
            recordingInfo.process.stdin.write('q');
            logger.debug(`Sent 'q' command to ffmpeg process for stream ${streamId}`);
          } catch (e) {
            logger.warn(`Failed to send 'q' command to ffmpeg: ${e.message}`);
          }
        }

        // Wait a bit longer for ffmpeg to flush its data to disk
        const sigintTimeout = setTimeout(() => {
          if (!hasExited && this.activeRecordings.has(streamId)) {
            try {
              logger.debug(`Sending SIGINT to ffmpeg process for stream ${streamId}`);
              recordingInfo.process.kill('SIGINT');
            } catch (e) {
              logger.warn(`Failed to send SIGINT to ffmpeg: ${e.message}`);
            }
          }
        }, 3000); // Wait 3 seconds before trying SIGINT

        // Set up a timeout to force kill if ffmpeg doesn't exit
        const forceKillTimeout = setTimeout(() => {
          if (!hasExited && this.activeRecordings.has(streamId)) {
            logger.warn(`Force-killing ffmpeg process for stream ${streamId} after grace period`);
            try {
              recordingInfo.process.kill('SIGKILL');

              // Create metadata file even for force-killed process
              this._createRecordingMetadata(streamId, recordingInfo.segmentDir, {
                start: recordingInfo.startTime,
                end: Date.now(),
                exitCode: -9,
                reason: 'force_killed'
              }).catch(err => {
                logger.error(`Failed to create metadata after force-kill: ${err.message}`);
              });

              // Finalize the playlist manually since the process was force-killed
              const playlistPath = path.join(recordingInfo.segmentDir, 'playlist.m3u8');
              this._finalizePlaylist(playlistPath)
                .then(() => {
                  logger.info(`Manually finalized playlist after force-killing ffmpeg for stream ${streamId}`);
                })
                .catch(err => {
                  logger.error(`Failed to finalize playlist after force-kill: ${err.message}`);
                });

              this.activeRecordings.delete(streamId);
              resolve(true);
            } catch (e) {
              // Process might already be gone
              logger.warn(`Error during force-kill: ${e.message}`);
              this.activeRecordings.delete(streamId);
              resolve(false);
            }
          }
        }, 15000); // 15 second grace period before SIGKILL

        // Listen for the process to exit
        recordingInfo.process.once('exit', () => {
          hasExited = true;
          clearTimeout(sigintTimeout);
          clearTimeout(forceKillTimeout);

          // Create metadata file for the stopped recording
          this._createRecordingMetadata(streamId, recordingInfo.segmentDir, {
            start: recordingInfo.startTime,
            end: Date.now(),
            exitCode: 0,
            reason: 'stopped'
          }).catch(err => {
            logger.error(`Failed to create metadata after stopping: ${err.message}`);
          });

          // Ensure playlist is finalized
          const playlistPath = path.join(recordingInfo.segmentDir, 'playlist.m3u8');
          this._finalizePlaylist(playlistPath)
            .then(() => {
              logger.info(`Finalized playlist after stopping recording for stream ${streamId}`);
              this.activeRecordings.delete(streamId);
              logger.info(`Stopped HLS recording for stream ${streamId} gracefully`);
              resolve(true);
            })
            .catch(err => {
              logger.error(`Failed to finalize playlist: ${err.message}`);
              this.activeRecordings.delete(streamId);
              resolve(true);
            });
        });

        return true;
      }

      logger.info(`No active recording found for stream ${streamId}`);
      resolve(false);
      return false;
    });
  }

  /**
   * Check if recordings are still healthy and restart any that are stalled
   */
  async checkRecordingsHealth() {
    logger.debug('Running recording health check...');
    const now = Date.now();
    const stalledThreshold = 60000; // 1 minute with no ffmpeg output is considered stalled

    for (const [streamId, info] of this.activeRecordings.entries()) {
      try {
        // Check if process is still alive
        const isRunning = info.process && typeof info.process.exitCode !== 'number';

        // Check if process has provided recent output
        const timeSinceLastActivity = now - info.lastHealthCheck;
        const isStalled = timeSinceLastActivity > stalledThreshold;

        if (!isRunning || isStalled) {
          logger.warn(`Recording for stream ${streamId} appears to be ${!isRunning ? 'dead' : 'stalled'} (${timeSinceLastActivity}ms since last activity)`);

          // Store URL and options before cleanup
          const url = info.url;
          const options = info.options;

          // Create metadata file for the incomplete recording
          await this._createRecordingMetadata(streamId, info.segmentDir, {
            start: info.startTime,
            end: now,
            exitCode: -1,
            reason: isStalled ? 'stalled' : 'process_died'
          });

          // Finalize the playlist for the stalled recording
          await this._finalizePlaylist(path.join(info.segmentDir, 'playlist.m3u8'));

          // Stop the current process
          if (isRunning) {
            try {
              info.process.kill('SIGKILL');
            } catch (error) {
              logger.error(`Error killing stalled process: ${error.message}`);
            }
          }

          // Remove from active recordings
          this.activeRecordings.delete(streamId);

          // Check if stream is still active in database
          const stream = await Stream.findById(streamId);
          if (stream && stream.status === 'active') {
            logger.info(`Restarting recording for stream ${streamId} after detecting ${!isRunning ? 'dead' : 'stalled'} process`);
            // Wait a moment before restarting
            setTimeout(() => {
              this.startRecording(streamId, url, options)
                .catch(err => logger.error(`Failed to restart recording for ${streamId}: ${err.message}`));
            }, 3000);
          }
        } else {
          // Process is alive and active, update health check timestamp
          info.lastHealthCheck = now;
        }
      } catch (error) {
        logger.error(`Error during health check for stream ${streamId}: ${error.message}`);
      }
    }
  }

  /**
   * Create a metadata file for a recording
   * @private
   */
  async _createRecordingMetadata(streamId, segmentDir, metadata) {
    try {
      const metadataPath = path.join(segmentDir, 'recording_info.json');
      
      // Add more details to the metadata
      const enhancedMetadata = {
        streamId,
        recordingFolder: path.basename(segmentDir),
        start: metadata.start,
        startTime: new Date(metadata.start).toISOString(),
        end: metadata.end,
        endTime: metadata.end ? new Date(metadata.end).toISOString() : null,
        duration: metadata.end ? Math.floor((metadata.end - metadata.start) / 1000) : null, // in seconds
        exitCode: metadata.exitCode,
        reason: metadata.reason || 'normal',
        created: new Date().toISOString()
      };
      
      await fs.writeFile(
        metadataPath,
        JSON.stringify(enhancedMetadata, null, 2)
      );
      
      logger.info(`Created recording metadata at ${metadataPath}`);
      return true;
    } catch (error) {
      logger.error(`Failed to write recording metadata: ${error.message}`);
      return false;
    }
  }

  /**
   * Restart recordings for all active streams
   * Used when server starts up
   */
  async restartAllActiveRecordings() {
    try {
      logger.info('Looking for active streams to restart recordings...');

      // Find all active streams
      const activeStreams = await Stream.find({ status: 'active' });

      logger.info(`Found ${activeStreams.length} active streams to set up for recording`);

      // Start recording for each active stream
      let successCount = 0;
      for (const stream of activeStreams) {
        try {
          const started = await this.startRecording(
            stream._id.toString(),
            stream.url,
            {
              username: stream.credentials?.username,
              password: stream.credentials?.password,
            }
          );

          if (started) {
            successCount++;
          }
        } catch (streamError) {
          logger.error(`Failed to restart recording for stream ${stream._id}: ${streamError.message}`);
        }
      }

      logger.info(`Successfully restarted ${successCount} stream recordings`);
      return successCount;
    } catch (error) {
      logger.error(`Failed to restart all recordings: ${error.message}`);
      return 0;
    }
  }

  /**
   * Stop all active recordings
   */
  async stopAllRecordings() {
    let count = 0;
    const streamIds = [...this.activeRecordings.keys()];

    for (const streamId of streamIds) {
      try {
        const stopped = await this.stopRecording(streamId);
        if (stopped) count++;
      } catch (error) {
        logger.error(`Failed to stop recording for stream ${streamId}: ${error.message}`);
      }
    }

    logger.info(`Stopped ${count} active recordings`);
    return count;
  }

  /**
   * Get the status of all recordings
   */
  getStatus() {
    const status = {
      activeRecordings: [],
      count: this.activeRecordings.size
    };

    // Add more detailed information
    for (const [streamId, info] of this.activeRecordings.entries()) {
      status.activeRecordings.push({
        streamId,
        startTime: new Date(info.startTime).toISOString(),
        duration: Math.floor((Date.now() - info.startTime) / 1000), // Duration in seconds
        lastActivity: Math.floor((Date.now() - info.lastHealthCheck) / 1000), // Seconds since last activity
        recordingFolder: path.basename(info.segmentDir)
      });
    }

    return status;
  }

  /**
   * Clean up resources when service stops
   */
  async shutdown() {
    // Clear health check interval
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Stop all recordings
    await this.stopAllRecordings();
    logger.info('HLS Recorder service shutdown complete');
  }
}

module.exports = new HlsRecorder();