const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');
const { logger } = require('../utils/logger');
const handlers = require('./handlers');

let globalIo = null;

// Initialize socket.io server
exports.initWebSocketServer = (server) => {
  const io = socketIo(server, {
    cors: {
      origin: process.env.CLIENT_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Middleware for authentication
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next();
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);
      // Store user data in socket
      socket.user = {
        id: decoded.id,
        role: decoded.role,
      };

      next();
    } catch (err) {
      logger.error(`WebSocket authentication error: ${err.message}`);
      next(new Error('Authentication error'));
    }
  });

  // Connection event
  io.on('connection', (socket) => {
    logger.info(`WebSocket connected: User ${socket.user?.id}`);

    // Track streams for current client
    const subscribedStreams = new Set();

    // Handle stream subscription
    socket.on('stream:subscribe', (streamId) => {
      handlers.handleStreamSubscription(
        io,
        socket,
        streamId,
        subscribedStreams
      );
    });

    // Handle stream unsubscription
    socket.on('stream:unsubscribe', (streamId) => {
      handlers.handleStreamUnsubscription(socket, streamId, subscribedStreams);
    });

    // Handle client disconnection
    socket.on('disconnect', () => {
      handlers.handleDisconnect(socket, subscribedStreams);
    });

    // Handle error
    socket.on('error', (error) => {
      logger.error(`WebSocket error: ${error.message}`);
    });
  });

  logger.info('WebSocket server initialized');

  globalIo = io;

  return io;
};

exports.getIO = () => {
  return globalIo || null;
};
