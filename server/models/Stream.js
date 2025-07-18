// Example of a Stream schema that correctly references Prompts
const mongoose = require('mongoose');

const StreamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['rtsp', 'http', 'hls', 'mjpeg'],
    default: 'rtsp'
  },
  description: {
    type: String
  },
  location: {
    type: String
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'error'],
    default: 'inactive'
  },
  credentials: {
    username: {
      type: String
    },
    password: {
      type: String
    }
  },
  settings: {
    lowLatency: {
      type: Boolean,
      default: true
    },
    autoReconnect: {
      type: Boolean,
      default: true
    },
    reconnectInterval: {
      type: Number,
      default: 5000
    },
    vision: {
      enabled: {
        type: Boolean,
        default: false
      },
      defaultPromptId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Prompt'
      },
      autoProcessInterval: {
        type: Number,
        default: 0 // 0 means disabled, otherwise in seconds
      },
      minSignificantChanges: {
        type: Number,
        default: 3.0 // threshold for frame difference
      },
      saveAllFrames: {
        type: Boolean,
        default: false
      }
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  category: {
    type: String,
    enum: ['door', 'store', 'escalator', 'elevator', 'other'],
    default: 'other'
  },
});
// Set updatedAt on save
StreamSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});
// Note: We're NOT creating Prompts inside the Stream model
// Prompts will be created separately through the API

module.exports = mongoose.model('Stream', StreamSchema);