const mongoose = require('mongoose');

const PaymentProofSchema = new mongoose.Schema({
  filename: { type: String },
  url: { type: String },
  secure_url: { type: String },
  public_id: { type: String },
  uploadedAt: { type: Date }
}, { _id: false });

const TicketSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  packageLabel: { type: String, required: true },
  checksRequested: { type: Number, required: true },
  priceUsd: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['paypal', 'crypto', 'card'], required: true },
  paymentOption: { type: String },
  userNote: { type: String },
  status: { type: String, enum: ['pending', 'submitted', 'completed', 'failed'], default: 'pending' },
  adminRemarks: { type: String },
  paymentProof: { type: PaymentProofSchema, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Ticket', TicketSchema);
