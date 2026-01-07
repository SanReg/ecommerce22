const express = require('express');
const Ticket = require('../models/Ticket');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { uploadBuffer } = require('../utils/cloudinary');

const router = express.Router();

const ALLOWED_METHODS = ['paypal', 'crypto', 'card'];
const ALLOWED_STATUS_UPDATES = ['completed', 'failed'];

function validateTicketPayload(body) {
  const errors = [];
  const { packageLabel, checksRequested, priceUsd, paymentMethod } = body;

  if (!packageLabel || typeof packageLabel !== 'string' || packageLabel.trim().length < 2) {
    errors.push('Package is required');
  }

  const checks = Number(checksRequested);
  if (!Number.isFinite(checks) || checks <= 0) {
    errors.push('Checks must be greater than 0');
  }

  const price = Number(priceUsd);
  if (!Number.isFinite(price) || price < 0) {
    errors.push('Price is required');
  }

  if (!paymentMethod || !ALLOWED_METHODS.includes(paymentMethod)) {
    errors.push('Payment method is invalid');
  }

  return errors;
}

// Create a ticket
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { packageLabel, checksRequested, priceUsd, paymentMethod, paymentOption, userNote } = req.body;
    const errors = validateTicketPayload({ packageLabel, checksRequested, priceUsd, paymentMethod });
    if (errors.length) {
      return res.status(400).json({ message: errors.join(', ') });
    }

    const ticket = new Ticket({
      user: req.userId,
      packageLabel: packageLabel.trim(),
      checksRequested: Number(checksRequested),
      priceUsd: Number(priceUsd),
      paymentMethod,
      paymentOption: paymentOption?.trim() || '',
      userNote: userNote?.trim() || ''
    });

    await ticket.save();
    const populated = await ticket.populate('user', 'username email');
    res.status(201).json({ message: 'Ticket created', ticket: populated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// User: list own tickets
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const tickets = await Ticket.find({ user: req.userId })
      .sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// User: upload proof and mark submitted
router.post('/:id/proof', authMiddleware, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    if (ticket.user.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized for this ticket' });
    }

    if (ticket.status === 'completed' || ticket.status === 'failed') {
      return res.status(400).json({ message: 'Ticket is already closed' });
    }

    if (!req.files || !req.files.proof) {
      return res.status(400).json({ message: 'Payment proof image is required' });
    }

    const file = req.files.proof;
    const result = await uploadBuffer(file.data, file.name, 'ecommerce-ticket-proof');
    ticket.paymentProof = {
      filename: result.public_id.split('/').pop(),
      url: result.secure_url,
      secure_url: result.secure_url,
      public_id: result.public_id,
      uploadedAt: new Date()
    };
    ticket.status = 'submitted';
    await ticket.save();

    res.json({ message: 'Payment proof uploaded', ticket });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin: list all tickets
router.get('/admin', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const tickets = await Ticket.find()
      .populate('user', 'username email checks isUnlimited')
      .sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin: update status and remarks
router.put('/admin/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status, adminRemarks } = req.body;
    if (!ALLOWED_STATUS_UPDATES.includes(status)) {
      return res.status(400).json({ message: 'Invalid status update' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Enforce payment proof upload before marking completed
    if (status === 'completed' && !ticket.paymentProof) {
      return res.status(400).json({ message: 'Cannot mark as completed: User has not uploaded payment proof screenshot yet' });
    }

    ticket.status = status;
    ticket.adminRemarks = adminRemarks?.trim() || '';
    await ticket.save();

    const populated = await ticket.populate('user', 'username email');
    res.json({ message: `Ticket ${status}`, ticket: populated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
