// server/config/redis.js
const Redis = require('ioredis');
const { logger } = require('../utils/logger');

let redisClient = null;

// Standard Redis client for general use
function getRedisClient() {
  if (!redisClient) {
    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      // Keep your existing configuration here
    });

    redisClient.on('connect', () => {
      logger.info(`Connected to Redis at ${redisClient.options.host}:${redisClient.options.port}`);
    });

    redisClient.on('error', (error) => {
      logger.error(`Redis connection error: ${error.message}`);
    });
  }
  return redisClient;
}

// Special Redis client factory for Bull queues that doesn't use
// enableReadyCheck or maxRetriesPerRequest
function createBullRedisClient() {
  const client = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    // IMPORTANT: Do not include enableReadyCheck or maxRetriesPerRequest
    // You can include other options as needed
    enableReadyCheck: false, // Must be false for Bull
    maxRetriesPerRequest: null // Must be null for Bull
  });
  
  return client;
}

module.exports = {
  getRedisClient,
  createBullRedisClient
};