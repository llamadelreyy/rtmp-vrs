// server/controllers/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET, JWT_EXPIRE, COOKIE_EXPIRE } = require('../config/env');
const { logger } = require('../utils/logger');

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ username }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });

    // Create token
    const token = user.getSignedJwtToken();

    // Remove password from response
    user.password = undefined;

    // Send token in HTTP-only cookie
    sendTokenResponse(user, token, 200, res);
  } catch (err) {
    logger.error(`Login error: ${err.message}`);
    next(err);
  }
};

// @desc    Logout user / clear cookie
// @route   GET /api/auth/logout
// @access  Private
exports.logout = (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({ success: true, data: {} });
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.status(200).json(user);
  } catch (err) {
    logger.error(`Get current user error: ${err.message}`);
    next(err);
  }
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Private (admin only)
exports.register = async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;

    // Check if user (admin) has permission to create this role
    if (req.user.role !== 'admin' && role === 'admin') {
      return res.status(403).json({ message: 'Not authorized to create admin users' });
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password,
      role: role || 'viewer'
    });

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    // Handle duplicate key error
    if (err.code === 11000) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    logger.error(`Registration error: ${err.message}`);
    next(err);
  }
};

// Helper function to send token response
const sendTokenResponse = (user, token, statusCode, res) => {
  const options = {
    expires: new Date(Date.now() + COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
    httpOnly: true
  };

  // Secure in production
  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
};