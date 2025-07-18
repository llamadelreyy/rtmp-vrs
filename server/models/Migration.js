const mongoose = require('mongoose');

const MigrationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  appliedAt: { type: Date, default: Date.now },
});

const Migration = mongoose.model('Migration', MigrationSchema);

module.exports = Migration;
