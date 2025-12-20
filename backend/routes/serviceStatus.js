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
      status = new ServiceStatus({ isOnline: true });
      await status.save();
    }
    
    res.json({
      isOnline: status.isOnline,
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
    const { isOnline } = req.body;

    if (typeof isOnline !== 'boolean') {
      return res.status(400).json({ message: 'isOnline must be a boolean value' });
    }

    let status = await ServiceStatus.findOne();
    
    if (!status) {
      status = new ServiceStatus({
        isOnline,
        updatedBy: req.userId,
        updatedAt: Date.now()
      });
    } else {
      status.isOnline = isOnline;
      status.updatedBy = req.userId;
      status.updatedAt = Date.now();
    }

    await status.save();

    res.json({
      message: 'Service status updated successfully',
      isOnline: status.isOnline,
      updatedAt: status.updatedAt
    });
  } catch (error) {
    console.error('Error updating service status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
