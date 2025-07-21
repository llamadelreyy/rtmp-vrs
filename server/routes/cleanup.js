const express = require('express');
const router = express.Router();
const { logger } = require('../utils/logger');
const { authenticate, authorize } = require('../middleware/auth');

// Get HLS recorder instance
const hlsRecorder = require('../services/hlsRecorder');

// @desc    Get cleanup statistics
// @route   GET /api/cleanup/stats
// @access  Private (admin only)
router.get('/stats', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const stats = await hlsRecorder.getCleanupStats();
    
    if (!stats) {
      return res.status(500).json({
        success: false,
        message: 'Failed to get cleanup statistics'
      });
    }

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error(`Get cleanup stats error: ${error.message}`);
    next(error);
  }
});

// @desc    Manually trigger cleanup
// @route   POST /api/cleanup/trigger
// @access  Private (admin only)
router.post('/trigger', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    logger.info(`Manual cleanup triggered by user ${req.user.id}`);
    
    await hlsRecorder.triggerCleanup();
    
    // Get updated stats after cleanup
    const stats = await hlsRecorder.getCleanupStats();
    
    res.status(200).json({
      success: true,
      message: 'Cleanup triggered successfully',
      data: stats
    });
  } catch (error) {
    logger.error(`Manual cleanup trigger error: ${error.message}`);
    next(error);
  }
});

// @desc    Force cleanup to target size
// @route   POST /api/cleanup/force
// @access  Private (admin only)
router.post('/force', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { targetSizeGB } = req.body;
    
    if (!targetSizeGB || targetSizeGB <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid targetSizeGB is required'
      });
    }

    logger.warn(`Force cleanup to ${targetSizeGB}GB triggered by user ${req.user.id}`);
    
    const result = await hlsRecorder.forceCleanup(targetSizeGB);
    
    res.status(200).json({
      success: true,
      message: 'Force cleanup completed',
      data: result
    });
  } catch (error) {
    logger.error(`Force cleanup error: ${error.message}`);
    next(error);
  }
});

// @desc    Get cleanup service status
// @route   GET /api/cleanup/status
// @access  Private (admin only)
router.get('/status', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const cleanupService = hlsRecorder.getCleanupService();
    
    res.status(200).json({
      success: true,
      data: {
        isRunning: cleanupService.isRunning,
        maxSizeGB: cleanupService.maxSizeGB,
        retentionDays: cleanupService.retentionDays,
        cleanupIntervalMinutes: cleanupService.cleanupIntervalMs / (1000 * 60)
      }
    });
  } catch (error) {
    logger.error(`Get cleanup status error: ${error.message}`);
    next(error);
  }
});

// @desc    Start cleanup service
// @route   POST /api/cleanup/start
// @access  Private (admin only)
router.post('/start', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const cleanupService = hlsRecorder.getCleanupService();
    cleanupService.start();
    
    logger.info(`Cleanup service started by user ${req.user.id}`);
    
    res.status(200).json({
      success: true,
      message: 'Cleanup service started'
    });
  } catch (error) {
    logger.error(`Start cleanup service error: ${error.message}`);
    next(error);
  }
});

// @desc    Stop cleanup service
// @route   POST /api/cleanup/stop
// @access  Private (admin only)
router.post('/stop', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const cleanupService = hlsRecorder.getCleanupService();
    cleanupService.stop();
    
    logger.info(`Cleanup service stopped by user ${req.user.id}`);
    
    res.status(200).json({
      success: true,
      message: 'Cleanup service stopped'
    });
  } catch (error) {
    logger.error(`Stop cleanup service error: ${error.message}`);
    next(error);
  }
});

module.exports = router;