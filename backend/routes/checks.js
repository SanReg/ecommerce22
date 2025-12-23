const express = require('express');
const User = require('../models/User');
const RedemptionCode = require('../models/RedemptionCode');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// Get checks balance
router.get('/balance', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    // Check if unlimited and process daily reset(s) if needed
    if (user.isUnlimited) {
      const now = new Date();

      // If creditsResetAt is missing, initialize to next UTC midnight
      if (!user.unlimitedSettings.creditsResetAt) {
        const nextReset = new Date(now);
        nextReset.setUTCHours(24, 0, 0, 0);
        user.unlimitedSettings.creditsResetAt = nextReset;
      }

      // Apply as many resets as have been skipped (handles missed days)
      while (user.isUnlimited && now > new Date(user.unlimitedSettings.creditsResetAt)) {
        user.unlimitedSettings.dailyCreditsUsedToday = 0;

        // Move reset window to next midnight
        const nextReset = new Date(user.unlimitedSettings.creditsResetAt);
        nextReset.setUTCHours(24, 0, 0, 0);
        user.unlimitedSettings.creditsResetAt = nextReset;

        // Decrement remaining subscription days per reset
        user.unlimitedSettings.subscriptionDaysRemaining -= 1;

        // If subscription expired, revert to normal and stop looping
        if (user.unlimitedSettings.subscriptionDaysRemaining <= 0) {
          user.isUnlimited = false;
          user.unlimitedSettings = {
            dailyCredits: 0,
            subscriptionDaysRemaining: 0,
            subscriptionStartDate: null,
            creditsResetAt: null,
            dailyCreditsUsedToday: 0
          };
        }
      }

      await user.save();
    }
    
    res.json({ 
      checks: user.checks,
      isUnlimited: user.isUnlimited,
      unlimitedInfo: user.isUnlimited ? {
        dailyCredits: user.unlimitedSettings.dailyCredits,
        dailyCreditsUsedToday: user.unlimitedSettings.dailyCreditsUsedToday,
        dailyCreditsAvailable: user.unlimitedSettings.dailyCredits - user.unlimitedSettings.dailyCreditsUsedToday,
        creditsResetAt: user.unlimitedSettings.creditsResetAt,
        subscriptionDaysRemaining: user.unlimitedSettings.subscriptionDaysRemaining
      } : null
    });
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
