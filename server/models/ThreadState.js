
const mongoose = require('mongoose');

const ThreadStateSchema = new mongoose.Schema({
  threadId: {
    type: String,
    required: true,
    unique: true
  },
  streamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stream',
    required: true
  },
  promptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prompt',
    required: true
  },
  lastProcessed: {
    type: Date,
    default: null
  },
  errorCount: {
    type: Number,
    default: 0
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure indexes for efficient queries
ThreadStateSchema.index({ streamId: 1 });
ThreadStateSchema.index({ active: 1 });

// Use a more reliable way to handle model creation
let ThreadState;
try {
  // Try to get the model if it exists
  ThreadState = mongoose.model('ThreadState');
} catch (error) {
  // If not, create it
  ThreadState = mongoose.model('ThreadState', ThreadStateSchema);
}

module.exports = ThreadState;