// server/models/VisionResult.js
const mongoose = require('mongoose');

const VisionResultSchema = new mongoose.Schema({
  streamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stream',
    required: true,
    index: true,
  },
  promptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prompt',
    required: false,
  },
  result: {
    type: String,
    required: false,
    default: null,
  },
  // Fix embedding field definition - can't have both index: false and sparse: true
  embedding: {
    type: [Number],
    // Remove both sparse and index settings to resolve the conflict
    // We'll create a vector index separately via the createVectorIndex script
  },
  imageUrl: {
    type: String,
  },
  processingTime: {
    type: Number, // in milliseconds
    required: true,
  },
  confidence: {
    type: Number, // optional confidence score (0-1)
  },
  detections: {
    type: Object,
    default: null,
    fire: {
      type: Boolean,
      default: false,
    },
    intrusion: {
      type: Boolean,
      default: false,
    },
    medical: {
      type: Boolean,
      default: false,
    },
  },
  tokenCount: {
    type: Number,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    recordingFolder: String, // Store the HLS recording folder name
    captureTimestamp: Date,  // When the frame was captured
  },
});

// Text indexing for search capabilities (keep the traditional text index as fallback)
VisionResultSchema.index({ result: 'text' });

module.exports = mongoose.model('VisionResult', VisionResultSchema);