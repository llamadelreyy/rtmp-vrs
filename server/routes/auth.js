// server/routes/auth.js
const express = require('express');
const { check } = require('express-validator');
const authController = require('../controllers/auth');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validation');

const router = express.Router();

// Login route
router.post(
  '/login',
  [
    check('username', 'Username is required').notEmpty(),
    check('password', 'Password is required').notEmpty()
  ],
  validate,
  authController.login
);

// Logout route
router.get('/logout', authenticate, authController.logout);

// Get current user
router.get('/me', authenticate, authController.getCurrentUser);

// Register route (typically only used by admin, might want to restrict in production)
router.post(
  '/register',
  [
    check('username', 'Username is required').notEmpty().isLength({ min: 3 }),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
    check('role', 'Role must be either admin, operator, or viewer')
      .optional()
      .isIn(['admin', 'operator', 'viewer'])
  ],
  validate,
  authenticate,
  authController.register
);

module.exports = router;