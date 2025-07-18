// server/routes/users.js
const express = require('express');
const router = express.Router();

// Temp route for testing
router.get('/test', (req, res) => {
  res.status(200).json({ success: true, message: 'Users route is working' });
});

module.exports = router;