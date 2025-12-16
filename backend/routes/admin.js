const express = require('express');
const Order = require('../models/Order');
const User = require('../models/User');
const Book = require('../models/Book');
const RedemptionCode = require('../models/RedemptionCode');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { uploadBuffer, cloudinary } = require('../utils/cloudinary');
const router = express.Router();

function generateCodeString() {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}

// Get all orders
router.get('/orders', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'username email checks')
      .populate('book', 'title author price')
      .sort({ createdAt: -1 });
    
    res.json(orders);
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

// Upload file for order
router.post('/orders/:id/upload', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    if (!req.files || !req.files.file) {
      return res.status(400).json({ message: 'No file provided' });
    }
    
    const file = req.files.file;
    const result = await uploadBuffer(file.data, `admin_${file.name}`, 'ecommerce-orders');

    order.adminFile = {
      filename: file.name,
      url: result.secure_url,
      secure_url: result.secure_url,
      public_id: result.public_id,
      uploadedAt: new Date()
    };
    
    await order.save();
    
    res.json({
      message: 'File uploaded successfully',
      adminFile: order.adminFile
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
      usedAt: null
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

module.exports = router;
