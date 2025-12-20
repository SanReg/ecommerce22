const express = require('express');
const Order = require('../models/Order');
const Book = require('../models/Book');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const { uploadBuffer, cloudinary } = require('../utils/cloudinary');
const router = express.Router();

// Create order (with file upload)
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { bookId } = req.body;
    
    if (!bookId) {
      return res.status(400).json({ message: 'Book ID is required' });
    }
    
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    
    const user = await User.findById(req.userId);
    if (user.checks < book.price) {
      return res.status(400).json({ message: 'Insufficient checks' });
    }
    
    // Handle file upload (required)
    if (!req.files || !req.files.file) {
      return res.status(400).json({ message: 'File upload is required to create an order' });
    }

    const file = req.files.file;
    const result = await uploadBuffer(file.data, file.name, 'ecommerce-orders');
    const userFile = {
      filename: result.public_id.split('/').pop(), // Use the renamed filename from Cloudinary
      url: result.secure_url,
      secure_url: result.secure_url,
      public_id: result.public_id,
      uploadedAt: new Date()
    };
    
    const order = new Order({
      user: req.userId,
      book: bookId,
      checksUsed: book.price,
      userFile: userFile
    });
    
    await order.save();
    
    user.checks -= book.price;
    await user.save();
    
    res.status(201).json({
      message: 'Order created successfully',
      order: {
        id: order._id,
        bookTitle: book.title,
        checksUsed: order.checksUsed,
        status: order.status,
        userFileUploaded: !!userFile
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user's orders
router.get('/my-orders', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.userId })
      .populate('book', 'title author price')
      .sort({ createdAt: -1 });
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single order
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('book', 'title author price')
      .populate('user', 'username email');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Check authorization
    if (order.user._id.toString() !== req.userId && !req.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
