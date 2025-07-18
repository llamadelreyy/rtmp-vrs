// server/services/frameCapture.js
const { spawn } = require('child_process');
const { logger } = require('../utils/logger');
const path = require('path');
const fs = require('fs').promises;
const { existsSync } = require('fs');
const Stream = require('../models/Stream');
const hlsRecorder = require('./hlsRecorder');

class FrameCapture {
  /**
 * Capture a single frame from a stream, prioritizing local HLS recordings for RTSP streams
 * @param {string} streamUrl - The stream URL
 * @param {Object} options - Options for frame capture
 * @returns {Promise<Buffer>} - The captured frame as a buffer
 */
  async captureFrame(streamUrl, options = {}) {
    console.info(`Starting frame capture for stream URL: ${streamUrl}`);
    console.info(`Capture options: ${JSON.stringify(options)}`);
    console.info(`Stream URL starts with rtsp://: ${streamUrl.startsWith('rtsp://')}`);
    console.info(`Stream URL type: ${typeof streamUrl}`);

    // Check if the URL is RTSP and if we should prioritize local HLS recordings
    if (streamUrl && streamUrl.startsWith('rtsp://') && options.streamId) {
      console.info('Condition passed! Trying to capture from local HLS recording');
      try {
        // Try to capture from local HLS recording first
        const frameFromHls = await this.captureFrameFromHls(options.streamId);
        if (frameFromHls) {
          console.info(`Successfully captured frame from local HLS recording for stream ${options.streamId}`);
          return frameFromHls;
        } else {
          console.info(`No frame available from local HLS for stream ${options.streamId}, falling back to remote RTSP`);
        }
      } catch (error) {
        console.warn(`Failed to capture from local HLS, falling back to remote stream: ${error.message}`);
        // Continue with remote capture if local fails
      }
    }

    // Fallback to remote capture
    console.info(`Capturing frame directly from remote stream URL: ${streamUrl.replace(/\/\/(.*):(.*)@/, '//***:***@')}`);
    return this.captureFrameFromRemote(streamUrl, options);
  }

  async captureFrameFromHls(streamId) {
    try {
      // Convert streamId to string if it's not already
      const searchId = String(streamId);
      
      // Check if we have an active recording for this stream - use string comparison
      let isRecording = false;
      let recordingInfo = null;
      
      // Check all active recordings for a matching ID
      for (const [key, info] of hlsRecorder.activeRecordings.entries()) {
        if (String(key) === searchId) {
          isRecording = true;
          recordingInfo = info;
          break;
        }
      }
      
      // This will give you information about all active recordings
      //const status = hlsRecorder.getStatus();
      //console.info(status);
      console.info(`HLS recording active for stream ${streamId}: ${isRecording}`);
  
      if (!isRecording || !recordingInfo) {
        logger.debug(`No active HLS recording found for stream ${streamId}`);
        return null;
      }
  
      // Get the recording directory
      const segmentDir = recordingInfo.segmentDir;
      console.info(`HLS segment directory for stream ${streamId}: ${segmentDir}`);
  
      if (!existsSync(segmentDir)) {
        logger.warn(`HLS segment directory does not exist: ${segmentDir}`);
        return null;
      }
  
      // Get the playlist file path
      const playlistPath = path.join(segmentDir, 'playlist.m3u8');
      console.info(`HLS playlist path for stream ${streamId}: ${playlistPath}`);
  
      if (!existsSync(playlistPath)) {
        logger.warn(`HLS playlist file does not exist: ${playlistPath}`);
        return null;
      }
  
      // Read the playlist to find the latest segment
      const playlistContent = await fs.readFile(playlistPath, 'utf8');
      console.info(`HLS playlist content length: ${playlistContent.length} bytes`);
  
      const segmentMatches = playlistContent.match(/segment_\d+\.ts/g);
      console.info(`HLS segments found in playlist: ${segmentMatches ? segmentMatches.length : 0}`);
  
      if (!segmentMatches || segmentMatches.length === 0) {
        logger.warn(`No segments found in playlist: ${playlistPath}`);
        return null;
      }
  
      // Get the latest segment (last in the playlist)
      const latestSegment = segmentMatches[segmentMatches.length - 1];
      const segmentPath = path.join(segmentDir, latestSegment);
      console.info(`Latest HLS segment for stream ${streamId}: ${latestSegment}`);
  
      if (!existsSync(segmentPath)) {
        logger.warn(`Latest segment file does not exist: ${segmentPath}`);
        return null;
      }
  
      // Use ffmpeg to extract a frame from the segment
      console.info(`Extracting frame from HLS segment: ${segmentPath}`);
  
      return new Promise((resolve, reject) => {
        // Modified ffmpeg arguments to extract a more stable frame
        // Use -ss option to seek to a position in the segment (50% through)
        const args = [
          '-y',                    // Overwrite output files
          '-loglevel', 'error',    // Only show errors
          '-i', segmentPath,       // Input file (the TS segment)
          '-ss', '00:00:01.500',   // Seek to 1.5 seconds - adjust based on your segment length
          '-frames:v', '1',        // Extract only one frame
          '-q:v', '2',             // High quality (1-31, lower is better)
          '-f', 'image2pipe',      // Output to pipe
          '-c:v', 'mjpeg',         // Output codec
          'pipe:1'                 // Output to stdout
        ];
  
        logger.debug(`Running ffmpeg with args: ${args.join(' ')}`);
  
        // Spawn ffmpeg process
        const ffmpeg = spawn('ffmpeg', args);
  
        // Collect output data
        const chunks = [];
        ffmpeg.stdout.on('data', (chunk) => {
          chunks.push(chunk);
        });
  
        // Handle process completion
        ffmpeg.on('close', (code) => {
          if (code === 0 && chunks.length > 0) {
            const buffer = Buffer.concat(chunks);
            console.info(`Successfully extracted frame from HLS segment, size: ${buffer.length} bytes`);
            resolve(buffer);
          } else {
            // If seeking fails (e.g., segment too short), try without seeking
            if (code !== 0) {
              console.warn(`Failed to extract frame with seeking, trying without seeking`);
  
              // Try again without the seek parameter
              const fallbackArgs = [
                '-y',
                '-loglevel', 'error',
                '-i', segmentPath,
                '-vf', 'select=gte(n\\,10)',  // Select the 10th frame
                '-frames:v', '1',
                '-q:v', '2',
                '-f', 'image2pipe',
                '-c:v', 'mjpeg',
                'pipe:1'
              ];
  
              const fallbackFfmpeg = spawn('ffmpeg', fallbackArgs);
              const fallbackChunks = [];
  
              fallbackFfmpeg.stdout.on('data', (chunk) => {
                fallbackChunks.push(chunk);
              });
  
              fallbackFfmpeg.on('close', (fallbackCode) => {
                if (fallbackCode === 0 && fallbackChunks.length > 0) {
                  const buffer = Buffer.concat(fallbackChunks);
                  console.info(`Successfully extracted frame using fallback method, size: ${buffer.length} bytes`);
                  resolve(buffer);
                } else {
                  const error = new Error(`Both ffmpeg attempts failed with code ${code} and ${fallbackCode}`);
                  logger.error(error.message);
                  reject(error);
                }
              });
  
              // Handle fallback errors
              let fallbackErrorOutput = '';
              fallbackFfmpeg.stderr.on('data', (data) => {
                fallbackErrorOutput += data.toString();
              });
  
              fallbackFfmpeg.on('error', (err) => {
                logger.error(`Fallback ffmpeg process error: ${err.message}`);
                reject(new Error(`Fallback ffmpeg process error: ${err.message}`));
              });
            } else {
              const error = new Error(`ffmpeg exited with code ${code}`);
              logger.error(error.message);
              reject(error);
            }
          }
        });
  
        // Handle process errors
        let errorOutput = '';
        ffmpeg.stderr.on('data', (data) => {
          const errorMsg = data.toString();
          errorOutput += errorMsg;
          logger.error(`ffmpeg error: ${errorMsg}`);
        });
  
        ffmpeg.on('error', (err) => {
          logger.error(`ffmpeg process error: ${err.message}`);
          reject(new Error(`ffmpeg process error: ${err.message}`));
        });
  
        // Set a timeout in case the process hangs
        const timeoutId = setTimeout(() => {
          ffmpeg.kill();
          logger.error('ffmpeg process timeout after 10000ms');
          reject(new Error('ffmpeg process timeout'));
        }, 10000);
  
        // Clear timeout if process completes
        ffmpeg.on('close', () => {
          clearTimeout(timeoutId);
          if (errorOutput && !chunks.length) {
            reject(new Error(`ffmpeg error: ${errorOutput.trim()}`));
          }
        });
      });
    } catch (error) {
      logger.error(`Error capturing frame from HLS for stream ${streamId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Capture a frame directly from a remote stream using ffmpeg
   * @param {string} streamUrl - The stream URL
   * @param {Object} options - Options for frame capture
   * @returns {Promise<Buffer>} - The captured frame as a buffer
   */
  async captureFrameFromRemote(streamUrl, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        // Check if streamUrl is provided
        if (!streamUrl) {
          return reject(new Error('Stream URL is required'));
        }

        // Initialize args array - we'll build it based on URL type
        let args = [
          '-y',                          // Overwrite output files
          '-loglevel', 'error'           // Only show errors
        ];

        // Add protocol-specific options
        if (streamUrl.startsWith('rtsp://')) {
          // RTSP specific options
          args.push('-rtsp_transport', 'tcp');   // Use TCP for RTSP (more reliable)

          // Add credential options if provided
          if (options.username && options.password) {
            // For RTSP, we need to include credentials in the URL if they're not already there
            if (!streamUrl.includes('@') && !streamUrl.includes('?user=')) {
              const urlObj = new URL(streamUrl);
              // Add auth to URL
              urlObj.username = options.username;
              urlObj.password = options.password;
              streamUrl = urlObj.toString();

              console.info(`Modified stream URL to include credentials: ${streamUrl.replace(/\/\/(.*):(.*)@/, '//***:***@')}`);
            }
          }
        }

        // Add the rest of the arguments
        args = args.concat([
          '-i', streamUrl,               // Input stream
          '-frames:v', '1',              // Capture a single frame
          '-q:v', '2',                   // High quality (1-31, lower is better)
          '-f', 'image2pipe',            // Output to pipe
          '-c:v', 'mjpeg',               // Output codec
          'pipe:1'                       // Output to stdout
        ]);

        // Log the command for debugging (but hide credentials)
        const debugArgs = [...args];
        const inputIndex = debugArgs.indexOf('-i');
        if (inputIndex > -1 && inputIndex + 1 < debugArgs.length) {
          debugArgs[inputIndex + 1] = debugArgs[inputIndex + 1].replace(/\/\/(.*):(.*)@/, '//***:***@');
        }
        logger.debug(`Running ffmpeg with args: ${debugArgs.join(' ')}`);

        // Spawn ffmpeg process
        const ffmpeg = spawn('ffmpeg', args);

        // Collect output data
        const chunks = [];
        ffmpeg.stdout.on('data', (chunk) => {
          chunks.push(chunk);
        });

        // Handle process completion
        ffmpeg.on('close', (code) => {
          if (code === 0 && chunks.length > 0) {
            const buffer = Buffer.concat(chunks);
            resolve(buffer);
          } else {
            reject(new Error(`ffmpeg exited with code ${code}`));
          }
        });

        // Handle process errors
        let errorOutput = '';
        ffmpeg.stderr.on('data', (data) => {
          const errorMsg = data.toString();
          errorOutput += errorMsg;
          logger.error(`ffmpeg error: ${errorMsg}`);
        });

        ffmpeg.on('error', (err) => {
          logger.error(`ffmpeg process error: ${err.message}`);
          reject(new Error(`ffmpeg process error: ${err.message}`));
        });

        // Set a timeout in case the process hangs
        const timeoutId = setTimeout(() => {
          ffmpeg.kill();
          logger.error(`ffmpeg process timeout after ${options.timeout || 10000}ms`);
          reject(new Error('ffmpeg process timeout'));
        }, options.timeout || 10000);

        // Clear timeout if process completes
        ffmpeg.on('close', () => {
          clearTimeout(timeoutId);
          if (errorOutput && !chunks.length) {
            reject(new Error(`ffmpeg error: ${errorOutput.trim()}`));
          }
        });

      } catch (error) {
        logger.error(`Frame capture error: ${error.message}`);
        reject(new Error(`Frame capture error: ${error.message}`));
      }
    });
  }

  /**
   * Get the most appropriate source for capturing a frame from a stream
   * @param {string} streamId - The ID of the stream
   * @returns {Promise<Object>} - An object with source info including type and URL
   */
  async getBestCaptureSource(streamId) {
    try {
      // Check if we have an active HLS recording
      const isActiveRecording = hlsRecorder.activeRecordings.has(streamId);

      if (isActiveRecording) {
        const recordingInfo = hlsRecorder.activeRecordings.get(streamId);
        return {
          type: 'hls',
          streamId,
          segmentDir: recordingInfo.segmentDir
        };
      }

      // Check if we have recent HLS recordings in the filesystem
      const baseDir = path.join(__dirname, '..', 'public', 'captures', streamId, 'HLS');
      if (existsSync(baseDir)) {
        try {
          const dirs = await fs.readdir(baseDir);

          if (dirs.length > 0) {
            // Sort directories by timestamp (newest first)
            dirs.sort((a, b) => {
              const timestampA = parseInt(a.split('_')[1] || '0');
              const timestampB = parseInt(b.split('_')[1] || '0');
              return timestampB - timestampA;
            });

            const latestDir = dirs[0];
            const latestPath = path.join(baseDir, latestDir);
            const playlistPath = path.join(latestPath, 'playlist.m3u8');

            if (existsSync(playlistPath)) {
              // Check how recent it is
              const stats = await fs.stat(playlistPath);
              const ageInMinutes = (Date.now() - stats.mtime.getTime()) / (1000 * 60);

              // Use if less than 5 minutes old
              if (ageInMinutes < 5) {
                return {
                  type: 'hls_archive',
                  streamId,
                  segmentDir: latestPath
                };
              }
            }
          }
        } catch (err) {
          logger.warn(`Error checking for recent HLS recordings: ${err.message}`);
        }
      }

      // Fallback to the stream URL
      const stream = await Stream.findById(streamId);
      if (!stream) {
        throw new Error(`Stream not found: ${streamId}`);
      }

      return {
        type: 'remote',
        streamId,
        url: stream.url,
        credentials: {
          username: stream.credentials?.username,
          password: stream.credentials?.password
        }
      };
    } catch (error) {
      logger.error(`Error determining best capture source: ${error.message}`);
      throw error;
    }
  }

  /**
   * Capture a frame by stream ID, prioritizing local HLS for RTSP streams
   * @param {string} streamId - The ID of the stream
   * @returns {Promise<Buffer>} - The captured frame as a buffer
   */
  async captureFrameById(streamId) {
    try {
      const stream = await Stream.findById(streamId);
      if (!stream) {
        throw new Error(`Stream not found: ${streamId}`);
      }

      // Check if the stream is RTSP to prioritize local HLS
      const isRtsp = stream.url.startsWith('rtsp://');

      if (isRtsp) {
        // For RTSP streams, try to use local HLS first
        try {
          const frameFromHls = await this.captureFrameFromHls(streamId);
          if (frameFromHls) {
            logger.info(`Successfully captured frame from local HLS recording for RTSP stream ${streamId}`);
            return frameFromHls;
          }
        } catch (error) {
          logger.warn(`Failed to capture from local HLS, falling back to remote RTSP: ${error.message}`);
          // Continue with remote capture if local fails
        }
      }

      // Fallback to remote capture
      return await this.captureFrameFromRemote(stream.url, {
        username: stream.credentials?.username,
        password: stream.credentials?.password,
        streamId // Pass streamId in case we need to identify the stream later
      });
    } catch (error) {
      logger.error(`Failed to capture frame for stream ${streamId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Simulate capturing a frame (for testing without ffmpeg)
   * Returns a static image buffer
   */
  async simulateCapture() {
    try {
      // In a real implementation, you would connect to the stream
      // For this example, we'll just return a dummy buffer or read a test image

      // Option 2: Read a test image from disk
      const fs = require('fs').promises;
      const path = require('path');
      const testImagePath = path.join(__dirname, '..', 'public', 'test-frame.jpg');

      // Check if test image exists
      try {
        await fs.access(testImagePath);
        return await fs.readFile(testImagePath);
      } catch (error) {
        // If test image doesn't exist, create a simple one using sharp
        try {
          const sharp = require('sharp');
          const testImage = await sharp({
            create: {
              width: 640,
              height: 480,
              channels: 3,
              background: { r: 100, g: 100, b: 100 }
            }
          })
            .jpeg()
            .toBuffer();

          // Save for future use
          await fs.mkdir(path.dirname(testImagePath), { recursive: true });
          await fs.writeFile(testImagePath, testImage);

          return testImage;
        } catch (sharpError) {
          logger.error(`Could not create test image: ${sharpError.message}`);
          // Fallback to a very simple buffer if sharp is not available
          return Buffer.from('dummy-frame-data');
        }
      }
    } catch (error) {
      logger.error(`Simulate capture error: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new FrameCapture();