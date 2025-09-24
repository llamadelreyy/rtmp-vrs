// server/config/env.js
require('dotenv').config();

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRE: process.env.JWT_EXPIRE || '1d',
  COOKIE_EXPIRE: parseInt(process.env.COOKIE_EXPIRE) || 1,
  SERVER_URL: process.env.SERVER_URL || 'http://localhost:5000',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  RATE_LIMIT_WINDOW_MS: eval(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  
  // AI Model Configuration
  // LLM Model Configuration
  LLM_API_URL: process.env.LLM_API_URL || 'http://192.168.50.104:9501/v1',
  LLM_API_URL_REMOTE: process.env.LLM_API_URL_REMOTE || 'http://60.51.17.97:9501/v1',
  LLM_MODEL: process.env.LLM_MODEL || 'llm_model',
  LLM_CONTEXT_SIZE: parseInt(process.env.LLM_CONTEXT_SIZE) || 262144,
  
  // Embedding Model Configuration
  EMBEDDING_API_URL: process.env.EMBEDDING_API_URL || 'http://192.168.50.104:9701/v1',
  EMBEDDING_API_URL_REMOTE: process.env.EMBEDDING_API_URL_REMOTE || 'http://60.51.17.97:9701/v1',
  EMBEDDING_MODEL: process.env.EMBEDDING_MODEL || 'embedding_model',
  EMBEDDING_CONTEXT_SIZE: parseInt(process.env.EMBEDDING_CONTEXT_SIZE) || 40960,
  
  // Vision Model Configuration
  VISION_API_URL: process.env.VISION_API_URL || 'http://192.168.50.118:7601/v1',
  VISION_API_URL_REMOTE: process.env.VISION_API_URL_REMOTE || 'http://60.51.17.97:7601/v1',
  VISION_MODEL: process.env.VISION_MODEL || 'vision_model',
  VISION_CONTEXT_SIZE: parseInt(process.env.VISION_CONTEXT_SIZE) || 40960,
  
  // Legacy VLM Configuration (keep for backward compatibility)
  VLM_API_URL: process.env.VLM_API_URL || 'http://localhost:8881/v1/chat/completions',
  VLM_MODEL: process.env.VLM_MODEL || 'Qwen2.5-VL-3B-Instruct',
  VLM_MAX_TOKENS: parseInt(process.env.VLM_MAX_TOKENS) || 1000
};