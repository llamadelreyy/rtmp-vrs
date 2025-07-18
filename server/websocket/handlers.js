const Stream = require('../models/Stream');
const Prompt = require('../models/Prompt'); // Add missing import
const { logger } = require('../utils/logger');

// Handle stream subscription
exports.handleStreamSubscription = async (
  io,
  socket,
  streamId,
  subscribedStreams
) => {
  try {
    if (subscribedStreams.has(streamId)) {
      logger.warn(
        `User ${socket.user?.id} already subscribed to stream ${streamId}`
      );
      return;
    }

    // Add to room for this stream
    socket.join(`stream:${streamId}`);

    // Add to set of subscribed streams
    subscribedStreams.add(streamId);

    logger.info(`User ${socket.user?.id} subscribed to stream ${streamId}`);
  } catch (err) {
    logger.error(`Error handling stream subscription: ${err.message}`);
    socket.emit('error', { message: 'Failed to subscribe to stream' });
  }
};

// Handle stream unsubscription
exports.handleStreamUnsubscription = (socket, streamId, subscribedStreams) => {
  try {
    // Remove from room for this stream
    socket.leave(`stream:${streamId}`);

    // Remove from set of subscribed streams
    subscribedStreams.delete(streamId);

    logger.info(`User ${socket.user.id} unsubscribed from stream ${streamId}`);
  } catch (err) {
    logger.error(`Error handling stream unsubscription: ${err.message}`);
    socket.emit('error', { message: 'Failed to unsubscribe from stream' });
  }
};

// Handle client disconnection
exports.handleDisconnect = (socket, subscribedStreams) => {
  logger.info(`WebSocket disconnected: User ${socket.user?.id}`);

  // Clear subscribed streams
  subscribedStreams.clear();
};

// Broadcast stream status update to all subscribers
exports.broadcastStreamStatus = (io, streamId, status) => {
  io.to(`stream:${streamId}`).emit('stream:status', {
    streamId,
    status,
  });

  logger.info(`Broadcasted status update for stream ${streamId}: ${status}`);
};

// Broadcast new stream to all clients
exports.broadcastNewStream = (io, stream) => {
  io.emit('stream:new', stream);

  logger.info(`Broadcasted new stream: ${stream._id}`);
};

// Broadcast stream update to all subscribers
exports.broadcastStreamUpdate = (io, stream) => {
  io.to(`stream:${stream._id}`).emit('stream:update', stream);

  logger.info(`Broadcasted update for stream ${stream._id}`);
};

// Broadcast stream deletion to all clients
exports.broadcastStreamDeletion = (io, streamId) => {
  io.emit('stream:delete', streamId);

  logger.info(`Broadcasted deletion of stream ${streamId}`);
};

exports.broadcastStreamPromptEvent = async (io, streamId, promptId, event) => {
  const prompt = await Prompt.findById(promptId);

  io.to(`stream:${streamId}`).emit('stream:event', {
    streamId,
    prompt,
    event,
  });

  logger.info(`Broadcasted event for stream ${streamId}: ${event}`);
};
