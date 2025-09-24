// server/routes/vision.js
const express = require('express');
const router = express.Router();
const visionController = require('../controllers/vision');
const { authenticate } = require('../middleware/auth'); 

// Add debugging middleware to log all requests
router.use((req, res, next) => {
  console.log(`Vision API request: ${req.method} ${req.path}`);
  next();
});

// Debug middleware to ensure they're working properly
console.log('Middleware check:', {
  authenticateIsFn: typeof authenticate === 'function'
});

// Get queue status - accessible to all authenticated users
router.get('/queue', authenticate, visionController.getQueueStatus);

// Get vision results for a stream
router.get('/streams/:streamId/results', authenticate, visionController.getStreamResults);

// Search vision results across all streams
router.get('/search', authenticate, visionController.searchResults);

// embedding-specific routes
router.post('/embedding', authenticate, visionController.generateEmbedding);
router.post('/backfill-embeddings', authenticate, visionController.backfillEmbeddings);

// Process a frame from a stream - requires operator or admin
router.post(
  '/streams/:streamId/prompts/:promptId/process',
  authenticate,
  visionController.processStreamFrame
);

// Thread management routes
router.post('/threads/:streamId/:promptId', authenticate, visionController.startThread);
router.delete('/threads/:threadId', authenticate, visionController.stopThread);
router.get('/threads/status', authenticate, visionController.getThreadsStatus);
// Add in vision.js routes
router.get('/test', (req, res) => {
  res.json({ message: 'Vision API is working' });
});

// Add this route to get recording folder by timestamp
router.get('/recording-by-time/:streamId', authenticate, visionController.getRecordingByTime);

// Generate live description for a stream
router.post('/generate-live-description/:streamId', authenticate, visionController.generateLiveDescription);

module.exports = router;