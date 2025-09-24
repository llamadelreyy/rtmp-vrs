// server/routes/reports.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { check, validationResult } = require('express-validator');
const reportsController = require('../controllers/reports');

// @route   POST /api/reports/generate
// @desc    Generate a new report
// @access  Private
router.post('/generate', auth, reportsController.generateReport);

// @route   GET /api/reports/status/:reportId
// @desc    Get report generation status
// @access  Private
router.get('/status/:reportId', auth, reportsController.getReportStatus);

// @route   GET /api/reports/download/:reportId
// @desc    Download a completed report
// @access  Private
router.get('/download/:reportId', auth, reportsController.downloadReport);

// @route   GET /api/reports
// @desc    Get user's reports
// @access  Private
router.get('/', auth, reportsController.getUserReports);

// @route   DELETE /api/reports/:reportId
// @desc    Delete a report
// @access  Private
router.delete('/:reportId', auth, reportsController.deleteReport);

module.exports = router;