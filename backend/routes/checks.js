const express = require('express');
const User = require('../models/User');
const RedemptionCode = require('../models/RedemptionCode');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// Get checks balance
router.get('/balance', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    res.json({ checks: user.checks });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Redeem code
router.post('/redeem', authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ message: 'Code is required' });
    }
    
    const redemptionCode = await RedemptionCode.findOne({ code: code.toUpperCase() });
    
    if (!redemptionCode) {
      return res.status(400).json({ message: 'Invalid code' });
    }
    
    if (redemptionCode.isUsed) {
      return res.status(400).json({ message: 'Code already used' });
    }
    
    const user = await User.findById(req.userId);
    user.checks += redemptionCode.checks;
    await user.save();
    
    redemptionCode.isUsed = true;
    redemptionCode.usedBy = req.userId;
    redemptionCode.usedAt = new Date();
    await redemptionCode.save();
    
    res.json({
      message: 'Code redeemed successfully',
      checksAdded: redemptionCode.checks,
      totalChecks: user.checks
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
