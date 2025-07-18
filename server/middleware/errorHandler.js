// server/middleware/errorHandler.js
const { logger } = require('../utils/logger');

module.exports = (err, req, res, next) => {
  // Log the error
  logger.error(`Error: ${err.message}`);
  
  // Log the stack trace in development
  if (process.env.NODE_ENV === 'development') {
    logger.error(err.stack);
  }
  
  // Handle MongoDB duplicate key error
  if (err.code === 11000) {
    return res.status(400).json({
      message: 'Duplicate key error',
      error: Object.keys(err.keyValue).map(key => `${key} already exists`).join(', ')
    });
  }
  
  // Handle validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      message: 'Validation error',
      error: messages.join(', ')
    });
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      message: 'Invalid token',
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      message: 'Token expired',
    });
  }
  
  // Default error
  res.status(err.statusCode || 500).json({
    message: err.message || 'Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};