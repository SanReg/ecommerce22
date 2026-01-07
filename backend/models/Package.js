const mongoose = require('mongoose');

const PackageSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  label: { type: String, required: true },
  checks: { type: Number, required: true },
  priceUsd: { type: Number, required: true },
  isUnlimited: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
}, {
  timestamps: true
});

module.exports = mongoose.model('Package', PackageSchema);
