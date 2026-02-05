const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  action: { type: String, required: true },
  admin: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: { type: String },
    email: { type: String }
  },
  details: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Log', logSchema);