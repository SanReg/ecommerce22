const express = require('express');
const Order = require('../models/Order');
const User = require('../models/User');
const Book = require('../models/Book');
const RedemptionCode = require('../models/RedemptionCode');
const Ticket = require('../models/Ticket');
const Package = require('../models/Package');
const ServiceStatus = require('../models/ServiceStatus');
const MaintenanceStatus = require('../models/MaintenanceStatus');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { uploadBuffer, cloudinary } = require('../utils/cloudinary');
const bcrypt = require('bcryptjs');
const router = express.Router();

// Number of recent orders to return for admin `/orders` endpoint
const return_order_no = 200;

function generateCodeString() {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
} 

// Get recent orders (limited) for admin
router.get('/orders', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'username email checks')
      .populate('book', 'title author price')
      .sort({ createdAt: -1 })
      .limit(return_order_no);
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get daily order stats for last N days (UTC dates)
router.get('/orders/stats/daily', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const daysQuery = parseInt(req.query.days, 10);
    const days = (!isNaN(daysQuery) && daysQuery > 0) ? Math.min(365, daysQuery) : 30;
    const end = new Date();
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - (days - 1));
    start.setUTCHours(0, 0, 0, 0);

    const agg = await Order.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $project: { status: 1, date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } } } },
      { $group: { _id: "$date", total: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } }, failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } } } },
      { $sort: { _id: 1 } }
    ]);

    const map = {};
    agg.forEach(r => { map[r._id] = { total: r.total, completed: r.completed, failed: r.failed }; });

    const results = [];
    const cur = new Date(start);
    for (let i = 0; i < days; i++) {
      const year = cur.getUTCFullYear();
      const month = String(cur.getUTCMonth() + 1).padStart(2, '0');
      const day = String(cur.getUTCDate()).padStart(2, '0');
      const key = `${year}-${month}-${day}`;
      const val = map[key] || { total: 0, completed: 0, failed: 0 };
      results.push({ date: key, total: val.total, completed: val.completed, failed: val.failed });
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    res.json({ days, results });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark order as complete
router.put('/orders/:id/complete', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    order.status = 'completed';
    order.completedAt = new Date();
    await order.save();
    
    res.json({ message: 'Order marked as completed', order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark order as failed and refund credits
router.put('/orders/:id/fail', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { reason } = req.body;
    const failureReason = (reason || '').trim();
    if (!failureReason || failureReason.length < 3) {
      return res.status(400).json({ message: 'Failure reason must be at least 3 characters' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status === 'completed') {
      return res.status(400).json({ message: 'Order already completed' });
    }
    if (order.status === 'failed') {
      return res.status(400).json({ message: 'Order already failed' });
    }

    const user = await User.findById(order.user);
    if (!user) {
      return res.status(404).json({ message: 'User for this order not found' });
    }

    // Refund credits respecting original payment source
    const dailyUsed = Number(order.dailyCreditsUsed) || 0;
    const regularUsed = Number(order.regularChecksUsed) || 0;
    const totalRefund = dailyUsed + regularUsed;

    if (dailyUsed > 0 && user.isUnlimited && user.unlimitedSettings) {
      const currentUsed = Number(user.unlimitedSettings.dailyCreditsUsedToday || 0);
      user.unlimitedSettings.dailyCreditsUsedToday = Math.max(0, currentUsed - dailyUsed);
    }
    if (regularUsed > 0) {
      user.checks = (Number(user.checks) || 0) + regularUsed;
    }

    order.status = 'failed';
    order.failureReason = failureReason;
    order.refundAmount = totalRefund;
    order.refundedAt = new Date();

    await Promise.all([user.save(), order.save()]);

    // Fetch fresh user data and recalculate daily credits from all non-failed orders
    const updatedUser = await User.findById(order.user).select('checks unlimitedSettings isUnlimited');
    
    if (updatedUser.isUnlimited) {
      // Recalculate daily credits from orders to ensure accuracy
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const allOrdersToday = await Order.find({
        user: order.user,
        createdAt: { $gte: today },
        status: { $ne: 'failed' }
      });
      const recalculatedDaily = allOrdersToday.reduce((sum, o) => sum + (o.dailyCreditsUsed || 0), 0);
      updatedUser.unlimitedSettings.dailyCreditsUsedToday = recalculatedDaily;
      await updatedUser.save();
    }

    res.json({
      message: 'Order marked as failed and credits refunded',
      order,
      userChecks: updatedUser.checks,
      dailyCreditsUsedToday: updatedUser.unlimitedSettings?.dailyCreditsUsedToday
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Upload file for order
router.post('/orders/:id/upload', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    if (!req.files || (!req.files.aiReport && !req.files.similarityReport)) {
      return res.status(400).json({ message: 'At least one file (AI Report or Similarity Report) is required' });
    }

    // Initialize adminFiles if not present
    if (!order.adminFiles) {
      order.adminFiles = {
        aiReport: null,
        similarityReport: null
      };
    }

    // Upload AI Report if provided
    if (req.files.aiReport) {
      const aiReportFile = req.files.aiReport;
      const aiResult = await uploadBuffer(aiReportFile.data, aiReportFile.name, 'ecommerce-orders');
      order.adminFiles.aiReport = {
        filename: aiResult.public_id.split('/').pop(), // Use the renamed filename from Cloudinary
        url: aiResult.secure_url,
        secure_url: aiResult.secure_url,
        public_id: aiResult.public_id,
        uploadedAt: new Date()
      };
    }

    // Upload Similarity Report if provided
    if (req.files.similarityReport) {
      const similarityFile = req.files.similarityReport;
      const similarityResult = await uploadBuffer(similarityFile.data, similarityFile.name, 'ecommerce-orders');
      order.adminFiles.similarityReport = {
        filename: similarityResult.public_id.split('/').pop(), // Use the renamed filename from Cloudinary
        url: similarityResult.secure_url,
        secure_url: similarityResult.secure_url,
        public_id: similarityResult.public_id,
        uploadedAt: new Date()
      };
    }
    
    await order.save();
    
    res.json({
      message: 'Files uploaded successfully',
      adminFiles: order.adminFiles
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// List redemption codes (admin)
router.get('/codes', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const codes = await RedemptionCode.find()
      .populate('usedBy', 'email username')
      .populate('createdBy', 'email username')
      .sort({ createdAt: -1 });

    res.json(codes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new redemption code (single-use)
router.post('/codes', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { code, checks } = req.body;

    const value = parseInt(checks, 10);
    if (!value || value <= 0) {
      return res.status(400).json({ message: 'Checks amount must be greater than 0' });
    }

    let finalCode = code ? code.toUpperCase().trim() : '';

    if (finalCode) {
      const existing = await RedemptionCode.findOne({ code: finalCode });
      if (existing) {
        return res.status(400).json({ message: 'Code already exists, choose a different value' });
      }
    } else {
      // Generate a unique code
      let unique = false;
      while (!unique) {
        const candidate = generateCodeString();
        const exists = await RedemptionCode.findOne({ code: candidate });
        if (!exists) {
          finalCode = candidate;
          unique = true;
        }
      }
    }

    const newCode = new RedemptionCode({
      code: finalCode,
      checks: value,
      isUsed: false,
      usedBy: null,
      usedAt: null,
      createdBy: req.userId
    });

    await newCode.save();

    res.status(201).json({
      message: 'Code created successfully',
      code: newCode
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all users with their checks
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find({ isAdmin: false })
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user details with orders
router.get('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const orders = await Order.find({ user: req.params.id })
      .populate('book', 'title author price');
    
    res.json({
      user,
      orders,
      totalOrdersCount: orders.length,
      completedOrdersCount: orders.filter(o => o.status === 'completed').length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Change user password (Admin only)
router.put('/users/:id/password', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Assign raw password and rely on User model pre-save hook to hash
    user.password = newPassword;
    await user.save();
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Export current MongoDB data (JSON download)
router.get('/export', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const timestamp = new Date().toISOString();
    const safeTs = timestamp.replace(/[:]/g, '-');

    const [users, orders, books, codes, tickets, packages, serviceStatus] = await Promise.all([
      User.find().lean(),
      Order.find().lean(),
      Book.find().lean(),
      RedemptionCode.find().lean(),
      Ticket.find().lean(),
      Package.find().lean(),
      ServiceStatus.find().lean()
    ]);

    const payload = {
      generatedAt: timestamp,
      collections: {
        users,
        orders,
        books,
        redemptionCodes: codes,
        tickets,
        packages,
        serviceStatus
      }
    };

    res.setHeader('Content-Disposition', `attachment; filename="mongo-backup-${safeTs}.json"`);
    res.type('application/json');
    res.send(JSON.stringify(payload, null, 2));
  } catch (error) {
    res.status(500).json({ message: 'Failed to export data', error: error.message });
  }
});

// Get maintenance status
router.get('/maintenance', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const maintenanceStatus = await MaintenanceStatus.getInstance();
    res.json(maintenanceStatus);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Toggle maintenance mode
router.post('/maintenance/toggle', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const maintenanceStatus = await MaintenanceStatus.getInstance();
    maintenanceStatus.isEnabled = !maintenanceStatus.isEnabled;
    maintenanceStatus.updatedAt = new Date();
    await maintenanceStatus.save();
    
    res.json({ 
      message: `Maintenance mode ${maintenanceStatus.isEnabled ? 'enabled' : 'disabled'}`,
      maintenanceStatus 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update maintenance message
router.put('/maintenance/message', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { message, estimatedEndTime } = req.body;
    const maintenanceStatus = await MaintenanceStatus.getInstance();
    
    if (message) {
      maintenanceStatus.message = message;
    }
    if (estimatedEndTime) {
      maintenanceStatus.estimatedEndTime = new Date(estimatedEndTime);
    }
    maintenanceStatus.updatedAt = new Date();
    await maintenanceStatus.save();
    
    res.json({ 
      message: 'Maintenance status updated',
      maintenanceStatus 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Public endpoint for maintenance status (no auth required)
router.get('/maintenance-public', async (req, res) => {
  try {
    const maintenanceStatus = await MaintenanceStatus.getInstance();
    res.json(maintenanceStatus);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
