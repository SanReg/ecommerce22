const mongoose = require('mongoose');

const serviceStatusSchema = new mongoose.Schema({
  isOnline: {
    type: Boolean,
    default: true
  },
  message: {
    type: String,
    default: ''
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

module.exports = mongoose.model('ServiceStatus', serviceStatusSchema);
