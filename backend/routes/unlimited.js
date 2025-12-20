const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Order = require('../models/Order');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Get all unlimited users
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const unlimitedUsers = await User.find(
      { isUnlimited: true },
      'username email checks isUnlimited unlimitedSettings adminPrivateNotes createdAt'
    ).sort({ 'unlimitedSettings.subscriptionDaysRemaining': -1 });

    res.json(unlimitedUsers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching unlimited users', error: error.message });
  }
});

// Get specific unlimited user details with daily orders
router.get('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user || !user.isUnlimited) {
      return res.status(404).json({ message: 'Unlimited user not found' });
    }

    // Get orders from today (GMT 0:00 to current time)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    const todayOrders = await Order.find({
      user: req.params.id,
      createdAt: { $gte: today }
    }).populate('book', 'title price').sort({ createdAt: -1 });

    // Calculate daily credits used today from ONLY non-failed, non-refunded orders
    const dailyCreditsUsedToday = todayOrders
      .filter(order => order.status !== 'failed') // Exclude failed orders
      .reduce(
        (sum, order) => sum + (order.dailyCreditsUsed || 0),
        0
      );

    res.json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        checks: user.checks,
        createdAt: user.createdAt,
        adminPrivateNotes: user.adminPrivateNotes
      },
      unlimited: {
        dailyCredits: user.unlimitedSettings.dailyCredits,
        subscriptionDaysRemaining: user.unlimitedSettings.subscriptionDaysRemaining,
        subscriptionStartDate: user.unlimitedSettings.subscriptionStartDate,
        creditsResetAt: user.unlimitedSettings.creditsResetAt,
        dailyCreditsUsedToday,
        dailyCreditsAvailable: user.unlimitedSettings.dailyCredits - dailyCreditsUsedToday
      },
      todayOrders: todayOrders.map(order => ({
        _id: order._id,
        book: order.book?.title,
        checksUsed: order.checksUsed,
        dailyCreditsUsed: order.dailyCreditsUsed,
        regularChecksUsed: order.regularChecksUsed,
        paymentSource: order.paymentSource,
        status: order.status,
        createdAt: order.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user details', error: error.message });
  }
});

// Make user unlimited (set subscription)
router.post('/users/:id/make-unlimited', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { dailyCredits, subscriptionDays } = req.body;

    if (!dailyCredits || !subscriptionDays || dailyCredits <= 0 || subscriptionDays <= 0) {
      return res.status(400).json({ message: 'Invalid daily credits or subscription days' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const now = new Date();
    const nextReset = new Date(now);
    nextReset.setUTCHours(24, 0, 0, 0);

    user.isUnlimited = true;
    user.unlimitedSettings = {
      dailyCredits,
      subscriptionDaysRemaining: subscriptionDays,
      subscriptionStartDate: now,
      creditsResetAt: nextReset,
      dailyCreditsUsedToday: 0
    };

    await user.save();

    res.json({
      message: 'User converted to unlimited successfully',
      user: {
        username: user.username,
        email: user.email,
        isUnlimited: user.isUnlimited,
        unlimitedSettings: user.unlimitedSettings
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
});

// Update unlimited subscription settings
router.put('/users/:id/unlimited', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { dailyCredits, subscriptionDays } = req.body;

    const user = await User.findById(req.params.id);
    if (!user || !user.isUnlimited) {
      return res.status(404).json({ message: 'Unlimited user not found' });
    }

    if (dailyCredits !== undefined && dailyCredits > 0) {
      user.unlimitedSettings.dailyCredits = dailyCredits;
    }

    if (subscriptionDays !== undefined && subscriptionDays > 0) {
      user.unlimitedSettings.subscriptionDaysRemaining = subscriptionDays;
    }

    await user.save();

    res.json({
      message: 'Unlimited settings updated',
      unlimitedSettings: user.unlimitedSettings
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating settings', error: error.message });
  }
});

// Update admin private notes
router.put('/users/:id/notes', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { notes } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.adminPrivateNotes = notes || '';
    await user.save();

    res.json({
      message: 'Notes updated',
      adminPrivateNotes: user.adminPrivateNotes
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating notes', error: error.message });
  }
});

// Revert user to normal (remove unlimited status)
router.post('/users/:id/revert-unlimited', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isUnlimited = false;
    user.unlimitedSettings = {
      dailyCredits: 0,
      subscriptionDaysRemaining: 0,
      subscriptionStartDate: null,
      creditsResetAt: null,
      dailyCreditsUsedToday: 0
    };

    await user.save();

    res.json({
      message: 'User reverted to normal status',
      isUnlimited: user.isUnlimited
    });
  } catch (error) {
    res.status(500).json({ message: 'Error reverting user', error: error.message });
  }
});

// Daily task: Process unlimited user credits reset (should be called at GMT 0:00)
router.post('/daily-reset', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Find all unlimited users
    const unlimitedUsers = await User.find({ isUnlimited: true });

    let processed = 0;
    let converted = 0;

    for (const user of unlimitedUsers) {
      // Reset daily credits and update reset time
      user.unlimitedSettings.dailyCreditsUsedToday = 0;
      
      const nextReset = new Date(now);
      nextReset.setUTCHours(24, 0, 0, 0);
      user.unlimitedSettings.creditsResetAt = nextReset;

      // Decrement subscription days
      user.unlimitedSettings.subscriptionDaysRemaining--;

      // If subscription expired, revert to normal
      if (user.unlimitedSettings.subscriptionDaysRemaining <= 0) {
        user.isUnlimited = false;
        user.unlimitedSettings = {
          dailyCredits: 0,
          subscriptionDaysRemaining: 0,
          subscriptionStartDate: null,
          creditsResetAt: null,
          dailyCreditsUsedToday: 0
        };
        converted++;
      }

      await user.save();
      processed++;
    }

    res.json({
      message: 'Daily reset completed',
      processed,
      convertedToNormal: converted
    });
  } catch (error) {
    res.status(500).json({ message: 'Error processing daily reset', error: error.message });
  }
});

module.exports = router;
