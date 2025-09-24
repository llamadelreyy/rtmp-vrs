// server/routes/test-models.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { logger } = require('../utils/logger');
const llmService = require('../services/llmService');
const embeddingService = require('../services/embeddingService');
const visionProcessor = require('../services/visionProcessor');

// @route   GET /api/test-models/status
// @desc    Test all model endpoints
// @access  Private (Admin only)
router.get('/status', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const results = {
      timestamp: new Date().toISOString(),
      models: {
        llm: { status: 'unknown', endpoint: '', model: '', error: null },
        embedding: { status: 'unknown', endpoint: '', model: '', error: null },
        vision: { status: 'unknown', endpoint: '', model: '', error: null }
      }
    };

    // Test LLM Service
    try {
      results.models.llm.endpoint = process.env.LLM_API_URL || process.env.LLM_API_URL_REMOTE || 'Not configured';
      results.models.llm.model = process.env.LLM_MODEL || 'Not configured';
      
      const llmTest = await llmService.testConnection();
      results.models.llm.status = llmTest ? 'connected' : 'failed';
      if (!llmTest) {
        results.models.llm.error = 'Connection test failed';
      }
    } catch (error) {
      results.models.llm.status = 'error';
      results.models.llm.error = error.message;
    }

    // Test Embedding Service
    try {
      results.models.embedding.endpoint = process.env.EMBEDDING_API_URL || process.env.EMBEDDING_API_URL_REMOTE || 'Not configured';
      results.models.embedding.model = process.env.EMBEDDING_MODEL || 'Not configured';
      
      const embedding = await embeddingService.generateEmbedding('test connection');
      results.models.embedding.status = embedding ? 'connected' : 'failed';
      if (!embedding) {
        results.models.embedding.error = 'Failed to generate test embedding';
      }
    } catch (error) {
      results.models.embedding.status = 'error';
      results.models.embedding.error = error.message;
    }

    // Test Vision Service
    try {
      results.models.vision.endpoint = process.env.VISION_API_URL || process.env.VISION_API_URL_REMOTE || 'Not configured';
      results.models.vision.model = process.env.VISION_MODEL || 'Not configured';
      
      // For vision, we can't easily test without an image, so just check configuration
      if (results.models.vision.endpoint !== 'Not configured' && results.models.vision.model !== 'Not configured') {
        results.models.vision.status = 'configured';
      } else {
        results.models.vision.status = 'not_configured';
        results.models.vision.error = 'Endpoint or model not configured';
      }
    } catch (error) {
      results.models.vision.status = 'error';
      results.models.vision.error = error.message;
    }

    // Overall status
    const allConnected = Object.values(results.models).every(model => 
      model.status === 'connected' || model.status === 'configured'
    );

    res.status(200).json({
      ...results,
      overall_status: allConnected ? 'all_systems_operational' : 'some_issues_detected',
      message: allConnected ? 'All model endpoints are properly configured' : 'Some model endpoints have issues'
    });

  } catch (error) {
    logger.error(`Model status test error: ${error.message}`);
    res.status(500).json({ 
      message: 'Failed to test model endpoints',
      error: error.message 
    });
  }
});

// @route   POST /api/test-models/llm
// @desc    Test LLM with custom prompt
// @access  Private (Admin only)
router.post('/llm', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { prompt = 'Hello, please respond with "LLM is working correctly"' } = req.body;
    
    const startTime = Date.now();
    const response = await llmService.generateCompletion(prompt);
    const responseTime = Date.now() - startTime;

    res.status(200).json({
      success: true,
      endpoint: process.env.LLM_API_URL || process.env.LLM_API_URL_REMOTE,
      model: process.env.LLM_MODEL,
      prompt,
      response,
      responseTime: `${responseTime}ms`
    });

  } catch (error) {
    logger.error(`LLM test error: ${error.message}`);
    res.status(500).json({ 
      success: false,
      error: error.message,
      endpoint: process.env.LLM_API_URL || process.env.LLM_API_URL_REMOTE,
      model: process.env.LLM_MODEL
    });
  }
});

// @route   POST /api/test-models/embedding
// @desc    Test embedding generation
// @access  Private (Admin only)
router.post('/embedding', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { text = 'This is a test sentence for embedding generation' } = req.body;
    
    const startTime = Date.now();
    const embedding = await embeddingService.generateEmbedding(text);
    const responseTime = Date.now() - startTime;

    res.status(200).json({
      success: !!embedding,
      endpoint: process.env.EMBEDDING_API_URL || process.env.EMBEDDING_API_URL_REMOTE,
      model: process.env.EMBEDDING_MODEL,
      text,
      embedding_dimensions: embedding ? embedding.length : 0,
      embedding_sample: embedding ? embedding.slice(0, 5) : null,
      responseTime: `${responseTime}ms`
    });

  } catch (error) {
    logger.error(`Embedding test error: ${error.message}`);
    res.status(500).json({ 
      success: false,
      error: error.message,
      endpoint: process.env.EMBEDDING_API_URL || process.env.EMBEDDING_API_URL_REMOTE,
      model: process.env.EMBEDDING_MODEL
    });
  }
});

module.exports = router;