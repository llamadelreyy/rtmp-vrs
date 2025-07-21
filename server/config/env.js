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
  
  // VLM Configuration
  VLM_API_URL: process.env.VLM_API_URL || 'http://localhost:8881/v1/chat/completions',
  VLM_MODEL: process.env.VLM_MODEL || 'Qwen2.5-VL-3B-Instruct',
  VLM_MAX_TOKENS: parseInt(process.env.VLM_MAX_TOKENS) || 1000
};