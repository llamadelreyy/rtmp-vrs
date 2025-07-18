// server/routes/streams.js
const express = require('express');
const { check, query } = require('express-validator');
const streamsController = require('../controllers/streams');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validation');
const Stream = require('../models/Stream'); // Add this import
const path = require('path'); // Add this for path operations
const fs = require('fs'); // Add this for file operations
const { existsSync } = require('fs'); // Add this for checking file existence
const { logger } = require('../utils/logger'); // Add this for logging
const cors = require('cors');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all streams
router.get('/', streamsController.getStreams);

router.get(
  '/by-event',
  [
    query('event')
      .default('fire')
      .isIn(['fire', 'intrusion', 'medical'])
      .withMessage('Event must be fire, intrusion, or medical'),
    query('maxAge', 'Max age (minutes) is required')
      .default(5)
      .notEmpty()
      .isNumeric(),
  ],
  validate,
  streamsController.listStreamsByPredefinedEvent
);

// Get single stream
router.get('/:id', streamsController.getStream);

// Create stream (only admin and operator can create)
router.post(
  '/',
  [
    check('name', 'Name is required').notEmpty().trim(),
    check('url', 'URL is required').notEmpty().trim(),
    check('type', 'Type must be rtsp, http, or hls')
      .optional()
      .isIn(['rtsp', 'http', 'hls']),
    check('description').optional().trim(),
    check('location').optional().trim(),
    check('credentials.username').optional().trim(),
    check('credentials.password').optional().trim(),
    check('settings.lowLatency').optional().isBoolean(),
    check('settings.autoReconnect').optional().isBoolean(),
    check('settings.reconnectInterval').optional().isNumeric(),
  ],
  validate,
  authorize('admin', 'operator'),
  streamsController.createStream
);

// Update stream (only admin and operator can update)
router.put(
  '/:id',
  [
    check('name').optional().trim(),
    check('url').optional().trim(),
    check('type', 'Type must be rtsp, http, or hls')
      .optional()
      .isIn(['rtsp', 'http', 'hls']),
    check('description').optional().trim(),
    check('location').optional().trim(),
    check('credentials.username').optional().trim(),
    check('credentials.password').optional().trim(),
    check('settings.lowLatency').optional().isBoolean(),
    check('settings.autoReconnect').optional().isBoolean(),
    check('settings.reconnectInterval').optional().isNumeric(),
  ],
  validate,
  authorize('admin', 'operator'),
  streamsController.updateStream
);

// Delete stream (only admin and operator can delete)
router.delete(
  '/:id',
  authorize('admin', 'operator'),
  streamsController.deleteStream
);

// Test stream connection
router.post(
  '/test',
  [
    check('url', 'URL is required').notEmpty().trim(),
    check('type', 'Type must be rtsp, http, or hls')
      .optional()
      .isIn(['rtsp', 'http', 'hls']),
    check('credentials.username').optional().trim(),
    check('credentials.password').optional().trim(),
  ],
  validate,
  authorize('admin', 'operator'),
  streamsController.testStream
);

// Get all prompts for a stream
router.get('/:streamId/prompts', streamsController.getStreamPrompts);

// Create a new prompt for a stream
router.post(
  '/:streamId/prompts',
  [
    check('name', 'Name is required').notEmpty().trim(),
    check('content').notEmpty(),
    check('description').optional().trim(),
  ],
  validate,
  authorize('admin', 'operator'),
  streamsController.createStreamPrompt
);

// Update a prompt
router.put(
  '/:streamId/prompts/:promptId',
  [
    check('name').optional().trim(),
    check('content').optional(),
    check('description').optional().trim(),
  ],
  validate,
  authorize('admin', 'operator'),
  streamsController.updateStreamPrompt
);

// server/routes/streamRoutes.js - Add new endpoint
// server/routes/streams.js
// Update the restart-hls endpoint to include proper error handling

router.get('/:id/restart-hls', authenticate, async (req, res) => {
  try {
    const streamId = req.params.id;
    const stream = await Stream.findById(streamId);

    if (!stream) {
      return res.status(404).json({ message: 'Stream not found' });
    }

    const hlsRecorder = require('../services/hlsRecorder');

    // Stop current recording
    await hlsRecorder.stopRecording(streamId);

    // Wait a moment for cleanup
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Try changing the stream settings to force a new connection
    const newStreamOptions = {
      username: stream.credentials?.username,
      password: stream.credentials?.password,
      forceReconnect: true, // Add a flag for the recorder to use
    };

    // Restart with modified options
    const success = await hlsRecorder.startRecording(
      streamId,
      stream.url,
      newStreamOptions
    );

    if (success) {
      res.status(200).json({ message: 'Stream restarted successfully' });
    } else {
      res.status(500).json({ message: 'Failed to restart stream' });
    }
  } catch (error) {
    logger.error(`Error restarting HLS stream: ${error.message}`);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add endpoint to access HLS streams directly

// Add a new endpoint that supports folder-specific requests
router.get('/:id/hls/:folder/:file', async (req, res) => {
  logger.debug(
    `HLS request with folder received - Stream ID: ${req.params.id}, Folder: ${req.params.folder}, File: ${req.params.file}`
  );

  try {
    const streamId = req.params.id;
    const folderName = req.params.folder;
    const fileName = req.params.file;

    // Validate folder name format to prevent directory traversal attacks
    if (!folderName.match(/^recording_\d+$/)) {
      return res.status(400).json({ message: 'Invalid folder format' });
    }

    // Base directory where recordings are stored
    const baseDir = path.join(
      __dirname,
      '..',
      'public',
      'captures',
      streamId,
      'HLS'
    );
    const dirPath = path.join(baseDir, folderName);
    const filePath = path.join(dirPath, fileName);

    logger.debug(`Full file path with folder: ${filePath}`);

    if (!existsSync(filePath)) {
      logger.error(`HLS file not found: ${filePath}`);
      return res.status(404).json({
        message: 'File not found',
        requestedFile: fileName,
        path: filePath,
      });
    }

    if (fileName.endsWith('.m3u8')) {
      logger.debug(`Sending m3u8 file with folder-specific paths`);

      // Read the m3u8 file
      let playlistContent = fs.readFileSync(filePath, 'utf8');

      // Replace segment paths with absolute paths that include our API endpoint and folder name
      playlistContent = playlistContent.replace(
        /^(segment_.*\.ts)/gm,
        `/api/streams/${streamId}/hls/${folderName}/$1`
      );

      // Set correct headers for m3u8 file
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-cache');

      return res.send(playlistContent);
    } else if (fileName.endsWith('.ts')) {
      // Set correct headers for TS segments
      res.setHeader('Content-Type', 'video/mp2t');
      res.setHeader('Cache-Control', 'public, max-age=86400');

      return res.sendFile(filePath);
    } else {
      console.log(`Invalid file type requested: ${fileName}`);
      return res.status(404).json({ message: 'Invalid file type requested' });
    }
  } catch (error) {
    console.error(`Error serving HLS file with folder: ${error.message}`);
    logger.error(`Error serving HLS file with folder: ${error.message}`);

    res.status(500).json({
      message: 'Server error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

// Add an endpoint to get latest recording folder name
router.get('/:id/hls-latest-folder', async (req, res) => {
  try {
    const streamId = req.params.id;
    const baseDir = path.join(
      __dirname,
      '..',
      'public',
      'captures',
      streamId,
      'HLS'
    );

    if (!existsSync(baseDir)) {
      return res.status(404).json({
        message: 'Stream HLS directory not found',
        streamId,
      });
    }

    // Get all recording directories
    const recordingDirs = await fs.promises.readdir(baseDir);

    if (recordingDirs.length === 0) {
      return res.status(404).json({
        message: 'No recordings found',
        streamId,
      });
    }

    // Find the most recent recording directory
    recordingDirs.sort((a, b) => {
      const timestampA = parseInt(a.split('_')[1] || '0');
      const timestampB = parseInt(b.split('_')[1] || '0');
      return timestampB - timestampA; // Sort descending (newest first)
    });

    const latestDir = recordingDirs[0];

    res.json({
      streamId,
      latestFolder: latestDir,
    });
  } catch (error) {
    logger.error(`Error getting latest HLS folder: ${error.message}`);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/:id/hls-status', authenticate, async (req, res) => {
  try {
    const streamId = req.params.id;
    const hlsRecorder = require('../services/hlsRecorder');
    const isRecording = hlsRecorder.activeRecordings.has(streamId);

    // Get recording details if available
    let recordingDetails = null;
    if (isRecording) {
      const info = hlsRecorder.activeRecordings.get(streamId);
      recordingDetails = {
        startTime: new Date(info.startTime).toISOString(),
        duration: Math.floor((Date.now() - info.startTime) / 1000),
        segmentDir: info.segmentDir,
      };
    }

    res.json({
      streamId,
      isRecording,
      recordingDetails,
    });
  } catch (error) {
    logger.error(`Error checking HLS status: ${error.message}`);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/:id/hls-debug', async (req, res) => {
  try {
    const streamId = req.params.id;
    const baseDir = path.join(
      __dirname,
      '..',
      'public',
      'captures',
      streamId,
      'HLS'
    );

    const response = {
      streamId,
      baseDirExists: existsSync(baseDir),
      basePath: baseDir,
      directories: [],
      latestDir: null,
      latestDirContents: [],
    };

    if (response.baseDirExists) {
      try {
        const dirs = await fs.promises.readdir(baseDir);
        response.directories = dirs;

        if (dirs.length > 0) {
          // Sort directories by timestamp (newest first)
          dirs.sort((a, b) => {
            const timestampA = parseInt(a.split('_')[1] || '0');
            const timestampB = parseInt(b.split('_')[1] || '0');
            return timestampB - timestampA;
          });

          response.latestDir = dirs[0];
          const latestPath = path.join(baseDir, dirs[0]);

          if (existsSync(latestPath)) {
            response.latestDirContents = await fs.promises.readdir(latestPath);
          }
        }
      } catch (err) {
        response.error = err.message;
      }
    }

    return res.json(response);
  } catch (error) {
    logger.error(`Error in HLS debug endpoint: ${error.message}`);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete a prompt
router.delete(
  '/:streamId/prompts/:promptId',
  authorize('admin', 'operator'),
  streamsController.deleteStreamPrompt
);

module.exports = router;
