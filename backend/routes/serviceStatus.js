const express = require('express');
const router = express.Router();
const ServiceStatus = require('../models/ServiceStatus');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Get current service status (public - all authenticated users can see)
router.get('/status', authMiddleware, async (req, res) => {
  try {
    let status = await ServiceStatus.findOne();
    
    // If no status exists, create one with default (online)
    if (!status) {
      status = new ServiceStatus({ isOnline: true, message: '' });
      await status.save();
    }
    
    res.json({
      isOnline: status.isOnline,
      message: status.message || '',
      updatedAt: status.updatedAt
    });
  } catch (error) {
    console.error('Error fetching service status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update service status (admin only)
router.put('/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { isOnline, message } = req.body;

    if (typeof isOnline !== 'boolean') {
      return res.status(400).json({ message: 'isOnline must be a boolean value' });
    }

    let status = await ServiceStatus.findOne();
    
    if (!status) {
      status = new ServiceStatus({
        isOnline,
        message: message || '',
        updatedBy: req.userId,
        updatedAt: Date.now()
      });
    } else {
      status.isOnline = isOnline;
      status.message = message || '';
      status.updatedBy = req.userId;
      status.updatedAt = Date.now();
    }

    await status.save();

    res.json({
      message: 'Service status updated successfully',
      isOnline: status.isOnline,
      customMessage: status.message,
      updatedAt: status.updatedAt
    });
  } catch (error) {
    console.error('Error updating service status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
