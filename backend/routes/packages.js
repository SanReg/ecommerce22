const express = require('express');
const router = express.Router();
const Package = require('../models/Package');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Get all packages (public)
router.get('/', async (req, res) => {
  try {
    const packages = await Package.find({ isActive: true }).sort({ order: 1 });
    res.json(packages);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all packages including inactive (admin only)
router.get('/all', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const packages = await Package.find().sort({ order: 1 });
    res.json(packages);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create package (admin only)
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id, label, checks, priceUsd, isUnlimited } = req.body;

    if (!id || !label || checks === undefined || priceUsd === undefined) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingPackage = await Package.findOne({ id });
    if (existingPackage) {
      return res.status(400).json({ message: 'Package ID already exists' });
    }

    const packageCount = await Package.countDocuments();
    const newPackage = new Package({
      id,
      label,
      checks: Number(checks),
      priceUsd: Number(priceUsd),
      isUnlimited: Boolean(isUnlimited),
      order: packageCount
    });

    await newPackage.save();
    res.status(201).json({ message: 'Package created successfully', package: newPackage });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update package (admin only)
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { label, checks, priceUsd, isUnlimited, isActive } = req.body;

    const pkg = await Package.findOne({ id: req.params.id });
    if (!pkg) {
      return res.status(404).json({ message: 'Package not found' });
    }

    if (label !== undefined) pkg.label = label;
    if (checks !== undefined) pkg.checks = Number(checks);
    if (priceUsd !== undefined) pkg.priceUsd = Number(priceUsd);
    if (isUnlimited !== undefined) pkg.isUnlimited = Boolean(isUnlimited);
    if (isActive !== undefined) pkg.isActive = Boolean(isActive);

    await pkg.save();
    res.json({ message: 'Package updated successfully', package: pkg });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete package (admin only)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const pkg = await Package.findOneAndDelete({ id: req.params.id });
    if (!pkg) {
      return res.status(404).json({ message: 'Package not found' });
    }
    res.json({ message: 'Package deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
