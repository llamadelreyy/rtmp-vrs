// server/controllers/reports.js
const { logger } = require('../utils/logger');
const llmService = require('../services/llmService');
const VisionResult = require('../models/VisionResult');
const Stream = require('../models/Stream');
const path = require('path');
const fs = require('fs').promises;

// Generate a new report
exports.generateReport = async (req, res, next) => {
  try {
    const { 
      type, 
      title, 
      timeRange, 
      cameras, 
      customPrompt,
      includeCharts = true,
      includeImages = true,
      format = 'PDF'
    } = req.body;

    if (!type || !title) {
      return res.status(400).json({ message: 'Report type and title are required' });
    }

    // Start report generation process
    const reportId = `report_${Date.now()}`;
    
    // Send immediate response
    res.status(202).json({
      message: 'Report generation started',
      reportId,
      estimatedTime: getEstimatedTime(type)
    });

    // Continue generation in background
    generateReportBackground(reportId, {
      type,
      title,
      timeRange,
      cameras,
      customPrompt,
      includeCharts,
      includeImages,
      format,
      userId: req.user.id
    });

  } catch (error) {
    logger.error(`Generate report error: ${error.message}`);
    next(error);
  }
};

// Get report status
exports.getReportStatus = async (req, res, next) => {
  try {
    const { reportId } = req.params;
    
    // This would typically check a database or cache for report status
    // For now, return a mock status
    const status = {
      reportId,
      status: Math.random() > 0.5 ? 'completed' : 'generating',
      progress: Math.floor(Math.random() * 100),
      estimatedTimeRemaining: Math.floor(Math.random() * 300), // seconds
      downloadUrl: `/api/reports/${reportId}/download`
    };

    res.status(200).json(status);
  } catch (error) {
    logger.error(`Get report status error: ${error.message}`);
    next(error);
  }
};

// Download report
exports.downloadReport = async (req, res, next) => {
  try {
    const { reportId } = req.params;
    
    // This would typically retrieve the actual report file
    // For now, return a mock response
    res.status(200).json({
      message: 'Report download would start here',
      reportId,
      downloadUrl: `/api/reports/${reportId}/file`
    });
  } catch (error) {
    logger.error(`Download report error: ${error.message}`);
    next(error);
  }
};

// List user reports
exports.getUserReports = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    // Mock reports data - replace with actual database query
    const mockReports = [
      {
        id: 'report_1',
        title: 'Daily Analysis - January 15, 2024',
        type: 'daily_analysis',
        status: 'completed',
        createdAt: new Date(),
        fileSize: '2.4 MB',
        format: 'PDF'
      }
    ];

    res.status(200).json({
      reports: mockReports,
      total: mockReports.length,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    logger.error(`Get user reports error: ${error.message}`);
    next(error);
  }
};

// Delete report
exports.deleteReport = async (req, res, next) => {
  try {
    const { reportId } = req.params;
    
    // This would typically delete the report from database and file system
    res.status(200).json({ message: 'Report deleted successfully' });
  } catch (error) {
    logger.error(`Delete report error: ${error.message}`);
    next(error);
  }
};

// Background report generation function
async function generateReportBackground(reportId, options) {
  try {
    logger.info(`Starting background report generation for ${reportId}`);
    
    // Gather surveillance data based on options
    const data = await gatherSurveillanceData(options);
    
    // Generate report using LLM
    const reportContent = await llmService.generateReport(data, options.type);
    
    // Save report to file system
    await saveReportToFile(reportId, reportContent, options.format);
    
    logger.info(`Report generation completed for ${reportId}`);
    
    // Here you would typically update the database with completion status
    // and notify the user via WebSocket or other means
    
  } catch (error) {
    logger.error(`Background report generation failed for ${reportId}: ${error.message}`);
  }
}

// Gather surveillance data for report
async function gatherSurveillanceData(options) {
  try {
    const { timeRange, cameras, type } = options;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case '24h':
        startDate.setHours(startDate.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      default:
        startDate.setHours(startDate.getHours() - 24);
    }
    
    // Build query
    const query = {
      timestamp: { $gte: startDate, $lte: endDate }
    };
    
    if (cameras && cameras.length > 0 && !cameras.includes('all')) {
      query.streamId = { $in: cameras };
    }
    
    // Get vision results
    const visionResults = await VisionResult.find(query)
      .populate('streamId')
      .sort({ timestamp: -1 })
      .limit(1000); // Limit for performance
    
    // Get stream information
    const streams = await Stream.find(
      cameras && cameras.length > 0 && !cameras.includes('all') 
        ? { _id: { $in: cameras } } 
        : {}
    );
    
    // Process and aggregate data
    const processedData = {
      timeRange: {
        start: startDate,
        end: endDate,
        duration: `${Math.round((endDate - startDate) / (1000 * 60 * 60))} hours`
      },
      streams: streams.map(s => ({
        id: s._id,
        name: s.name,
        status: s.status
      })),
      totalEvents: visionResults.length,
      eventsByType: aggregateEventsByType(visionResults),
      eventsByHour: aggregateEventsByHour(visionResults),
      detectionSummary: aggregateDetections(visionResults),
      topEvents: visionResults.slice(0, 10).map(r => ({
        timestamp: r.timestamp,
        stream: r.streamId?.name || 'Unknown',
        description: r.result,
        detections: r.detections
      }))
    };
    
    return processedData;
  } catch (error) {
    logger.error(`Error gathering surveillance data: ${error.message}`);
    return { error: error.message };
  }
}

// Helper functions
function aggregateEventsByType(results) {
  const types = {};
  results.forEach(result => {
    if (result.detections) {
      if (result.detections.fire) types.fire = (types.fire || 0) + 1;
      if (result.detections.intrusion) types.intrusion = (types.intrusion || 0) + 1;
      if (result.detections.medical) types.medical = (types.medical || 0) + 1;
    }
  });
  return types;
}

function aggregateEventsByHour(results) {
  const hourly = {};
  results.forEach(result => {
    const hour = new Date(result.timestamp).getHours();
    hourly[hour] = (hourly[hour] || 0) + 1;
  });
  return hourly;
}

function aggregateDetections(results) {
  return {
    totalDetections: results.length,
    withFire: results.filter(r => r.detections?.fire).length,
    withIntrusion: results.filter(r => r.detections?.intrusion).length,
    withMedical: results.filter(r => r.detections?.medical).length
  };
}

function getEstimatedTime(type) {
  const times = {
    daily_analysis: '2-3 minutes',
    security_incidents: '3-5 minutes',
    traffic_footfall: '2-4 minutes',
    compliance: '5-7 minutes'
  };
  return times[type] || '3-5 minutes';
}

async function saveReportToFile(reportId, content, format) {
  try {
    const reportsDir = path.join(__dirname, '..', 'public', 'reports');
    await fs.mkdir(reportsDir, { recursive: true });
    
    const filename = `${reportId}.${format.toLowerCase()}`;
    const filepath = path.join(reportsDir, filename);
    
    // For now, just save as text file
    // In production, you'd convert to actual PDF/DOCX
    await fs.writeFile(filepath, content, 'utf8');
    
    logger.info(`Report saved to ${filepath}`);
  } catch (error) {
    logger.error(`Error saving report: ${error.message}`);
    throw error;
  }
}

module.exports = {
  generateReport: exports.generateReport,
  getReportStatus: exports.getReportStatus,
  downloadReport: exports.downloadReport,
  getUserReports: exports.getUserReports,
  deleteReport: exports.deleteReport
};