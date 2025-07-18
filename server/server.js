const http = require('http');
const app = require('./app');
const { initWebSocketServer } = require('./websocket/server');
const { logger } = require('./utils/logger');
const { PORT } = require('./config/env');
// server/server.js (add near the end)
const autoProcessor = require('./services/autoProcessor');
const threadManager = require('./services/threadManager');
const hlsRecorder = require('./services/hlsRecorder');

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server
const io = initWebSocketServer(server);

// Start server
server.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);

  // Start services after server is running
  try {
    await autoProcessor.start();
    logger.info('Auto-processor started');

    await threadManager.start();
    logger.info('Thread manager started');
  } catch (error) {
    logger.error(`Error starting services: ${error.message}`);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  // In production, we might want to exit and let the process manager restart
  // process.exit(1);
});

// Start the auto-processor when the server starts
app.on('ready', async () => {
  try {
    await autoProcessor.start();
    logger.info('Auto-processor started');
  } catch (error) {
    logger.error(`Error starting auto-processor: ${error.message}`);
  }
});

// Update the shutdown handlers
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received');
  autoProcessor.stop();
  // Stop all recordings on shutdown
  hlsRecorder.stopAllRecordings();
  threadManager.stopAllThreads().then(() => {
    logger.info('Graceful shutdown completed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received');
  autoProcessor.stop();
  // Stop all recordings on shutdown
  hlsRecorder.stopAllRecordings();
  threadManager.stopAllThreads().then(() => {
    logger.info('Graceful shutdown completed');
    process.exit(0);
  });
});

module.exports = server;
