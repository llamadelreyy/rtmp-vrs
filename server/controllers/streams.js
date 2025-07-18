// server/controllers/streams.js
const Stream = require('../models/Stream');
const Prompt = require('../models/Prompt');
const VisionResult = require('../models/VisionResult');
const { logger } = require('../utils/logger');
const handlers = require('../websocket/handlers');
const { getIO } = require('../websocket/server');

const io = getIO();

// @desc    Get all streams
// @route   GET /api/streams
// @access  Private
exports.getStreams = async (req, res, next) => {
  try {
    const streams = await Stream.find();

    res.status(200).json(streams);
  } catch (err) {
    logger.error(`Get streams error: ${err.message}`);
    next(err);
  }
};

// @desc    Get single stream
// @route   GET /api/streams/:id
// @access  Private
exports.getStream = async (req, res, next) => {
  try {
    const stream = await Stream.findById(req.params.id);

    if (!stream) {
      return res.status(404).json({ message: 'Stream not found' });
    }

    res.status(200).json(stream);
  } catch (err) {
    logger.error(`Get stream error: ${err.message}`);
    next(err);
  }
};

// @desc    Create new stream
// @route   POST /api/streams
// @access  Private (admin & operator)
exports.createStream = async (req, res, next) => {
  try {
    // Add user id to stream data
    req.body.createdBy = req.user.id;

    // Remove any prompt-related fields if they exist to prevent validation errors
    if (req.body.prompts) {
      delete req.body.prompts;
    }

    const stream = await Stream.create(req.body);

    // Broadcast new stream to all clients if WebSocket is available
    if (io) {
      handlers.broadcastNewStream(io, stream);
    }

    res.status(201).json(stream);
  } catch (err) {
    logger.error(`Create stream error: ${err.message}`);
    next(err);
  }
};

// @desc    Update stream
// @route   PUT /api/streams/:id
// @access  Private (admin & operator)
exports.updateStream = async (req, res, next) => {
  try {
    let stream = await Stream.findById(req.params.id);

    if (!stream) {
      return res.status(404).json({ message: 'Stream not found' });
    }

    // Store the previous status before update
    const prevStatus = stream.status;
    
    // Update stream
    stream = await Stream.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    // Handle recording state based on status change
    if (prevStatus !== stream.status) {
      const hlsRecorder = require('../services/hlsRecorder');
      
      if (stream.status === 'active') {
        // Start recording if stream became active
        logger.info(`Stream ${stream._id} became active, starting recording...`);
        await hlsRecorder.startRecording(
          stream._id.toString(),
          stream.url,
          {
            username: stream.credentials?.username,
            password: stream.credentials?.password,
          }
        );
      } else if (stream.status === 'inactive' || stream.status === 'error') {
        // Stop recording if stream became inactive or has error
        logger.info(`Stream ${stream._id} became ${stream.status}, stopping recording...`);
        await hlsRecorder.stopRecording(stream._id.toString());
      }
    }

    // Broadcast stream update to all subscribers if WebSocket is available
    if (io) {
      handlers.broadcastStreamUpdate(io, stream);
    }

    res.status(200).json(stream);
  } catch (err) {
    logger.error(`Update stream error: ${err.message}`);
    next(err);
  }
};

// @desc    Delete stream
// @route   DELETE /api/streams/:id
// @access  Private (admin & operator)
exports.deleteStream = async (req, res, next) => {
  try {
    const stream = await Stream.findById(req.params.id);

    if (!stream) {
      return res.status(404).json({ message: 'Stream not found' });
    }

    await Stream.deleteOne({ _id: req.params.id });

    // Also delete all prompts associated with this stream
    await Prompt.deleteMany({ streamId: req.params.id });

    // Broadcast stream deletion to all clients if WebSocket is available
    if (io) {
      handlers.broadcastStreamDeletion(io, req.params.id);
    }

    res.status(200).json({ success: true });
  } catch (err) {
    logger.error(`Delete stream error: ${err.message}`);
    next(err);
  }
};

// @desc    Test stream connection
// @route   POST /api/streams/test
// @access  Private (admin & operator)
exports.testStream = async (req, res, next) => {
  try {
    const { url, type, credentials } = req.body;

    // Here we would normally send a request to the Python FastAPI backend
    // to test the stream connection. For this example, we'll simulate a response.

    // Simulate a delay for testing
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Simulate a successful test for demonstration
    const testResult = {
      success: true,
      message: 'Stream connection successful',
      details: {
        resolution: '1280x720',
        codec: 'H.264',
        framerate: 30,
        bitrate: '2 Mbps',
      },
    };

    // To simulate an error, you could use:
    // const testResult = {
    //   success: false,
    //   message: 'Failed to connect to stream',
    //   error: 'Connection timeout'
    // };

    res.status(200).json(testResult);
  } catch (err) {
    logger.error(`Test stream error: ${err.message}`);
    next(err);
  }
};

// @desc    Get all prompts for a stream
// @route   GET /api/streams/:streamId/prompts
// @access  Private
exports.getStreamPrompts = async (req, res, next) => {
  try {
    const { streamId } = req.params;

    // Verify stream exists
    const stream = await Stream.findById(streamId);
    if (!stream) {
      return res.status(404).json({ message: 'Stream not found' });
    }

    const prompts = await Prompt.find({ streamId });

    res.status(200).json(prompts);
  } catch (err) {
    logger.error(`Get stream prompts error: ${err.message}`);
    next(err);
  }
};

// @desc    Create a new prompt for a stream
// @route   POST /api/streams/:streamId/prompts
// @access  Private (admin & operator)
exports.createStreamPrompt = async (req, res, next) => {
  try {
    const { streamId } = req.params;
    const { name, content, description } = req.body; // Make sure you're destructuring content from req.body
    
    // Verify the stream exists
    const stream = await Stream.findById(streamId);
    if (!stream) {
      return res.status(404).json({ message: 'Stream not found' });
    }
    
    // Create a new prompt
    const prompt = new Prompt({
      streamId,
      name,
      content, // This was likely undefined
      description,
      createdBy: req.user.id
    });
    
    // Save the prompt
    await prompt.save();
    
    res.status(201).json(prompt);
  } catch (err) {
    logger.error(`Create stream prompt error: ${err.message}`);
    logger.error(`${err}`);
    logger.error(err.stack);
    next(err);
  }
};

// @desc    Update a prompt
// @route   PUT /api/streams/:streamId/prompts/:promptId
// @access  Private (admin & operator)
exports.updateStreamPrompt = async (req, res, next) => {
  try {
    const { streamId, promptId } = req.params;

    // Verify stream exists
    const stream = await Stream.findById(streamId);
    if (!stream) {
      return res.status(404).json({ message: 'Stream not found' });
    }

    // Find prompt
    let prompt = await Prompt.findById(promptId);
    if (!prompt) {
      return res.status(404).json({ message: 'Prompt not found' });
    }

    // Verify prompt belongs to stream
    if (prompt.streamId.toString() !== streamId) {
      return res
        .status(400)
        .json({ message: 'Prompt does not belong to this stream' });
    }

    // Update prompt fields
    if (req.body.name) prompt.name = req.body.name;
    if (req.body.content) prompt.content = req.body.content;
    if (req.body.description !== undefined)
      prompt.description = req.body.description;
    prompt.updatedAt = Date.now();

    await prompt.save();

    res.status(200).json(prompt);
  } catch (err) {
    logger.error(`Update stream prompt error: ${err.message}`);
    next(err);
  }
};

// @desc    Delete a prompt
// @route   DELETE /api/streams/:streamId/prompts/:promptId
// @access  Private (admin & operator)
exports.deleteStreamPrompt = async (req, res, next) => {
  try {
    const { streamId, promptId } = req.params;

    // Verify stream exists
    const stream = await Stream.findById(streamId);
    if (!stream) {
      return res.status(404).json({ message: 'Stream not found' });
    }

    // Find prompt
    const prompt = await Prompt.findById(promptId);
    if (!prompt) {
      return res.status(404).json({ message: 'Prompt not found' });
    }

    // Verify prompt belongs to stream
    if (prompt.streamId.toString() !== streamId) {
      return res
        .status(400)
        .json({ message: 'Prompt does not belong to this stream' });
    }

    await Prompt.deleteOne({ _id: promptId });

    res
      .status(200)
      .json({ success: true, message: 'Prompt deleted successfully' });
  } catch (err) {
    logger.error(`Delete stream prompt error: ${err.message}`);
    next(err);
  }
};

exports.listStreamsByEventId = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    const streams = await Stream.find({ eventId }).populate('prompts').exec();

    if (!streams || streams.length === 0) {
      return res
        .status(404)
        .json({ message: 'No streams found for this event' });
    }

    res.status(200).json(streams);
  } catch (err) {
    logger.error(`List streams by event ID error: ${err.message}`);
    next(err);
  }
};

exports.listStreamsByPredefinedEvent = async (req, res, next) => {
  try {
    const { event } = req.query;

    // in minutes
    const maxAge = parseInt(req.params.maxAge || req.query.maxAge || 5, 10);

    const visionResults = await VisionResult.find({
      [`detections.${event}`]: true,
      timestamp: {
        $gt: new Date(Date.now() - maxAge * 60 * 1000),
      },
    }).exec();

    const streamIds = visionResults.map((result) => result.streamId);

    const streams = await Stream.find({ _id: { $in: streamIds } }).exec();

    res.status(200).json(streams);
  } catch (err) {
    logger.error(`List streams by predefined event error: ${err.message}`);
    next(err);
  }
};
