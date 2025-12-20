const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true
  },
  checksUsed: {
    type: Number,
    required: true
  },
  // Track how the payment was split for refunds and reporting
  dailyCreditsUsed: {
    type: Number,
    default: 0
  },
  regularChecksUsed: {
    type: Number,
    default: 0
  },
  paymentSource: {
    type: String,
    enum: ['daily', 'regular', 'mixed'],
    default: 'regular'
  },
  userFile: {
    filename: String,
    url: String,
    public_id: String,
    uploadedAt: Date
  },
  adminFiles: {
    aiReport: {
      filename: String,
      url: String,
      public_id: String,
      uploadedAt: Date
    },
    similarityReport: {
      filename: String,
      url: String,
      public_id: String,
      uploadedAt: Date
    }
  },
  adminFile: {
    filename: String,
    url: String,
    public_id: String,
    uploadedAt: Date
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  completedAt: {
    type: Date,
    default: null
  },
  failureReason: {
    type: String,
    default: null
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  refundedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Order', orderSchema);
