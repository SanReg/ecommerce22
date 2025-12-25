const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');

// Health check endpoint - for cronjob monitoring
router.get('/', async (req, res) => {
  try {
    const startTime = Date.now();
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      checks: {
        mongodb: 'checking...',
        server: 'ok'
      }
    };

    // Check MongoDB connection
    const mongoStatus = mongoose.connection.readyState;
    health.checks.mongodb = mongoStatus === 1 ? 'connected' : 'disconnected';

    // Try a simple database query if connected
    if (mongoStatus === 1) {
      try {
        await User.collection.findOne({});
        health.responseTime = `${Date.now() - startTime}ms`;
      } catch (dbError) {
        health.checks.mongodb = 'query_failed';
        health.status = 'degraded';
        health.responseTime = `${Date.now() - startTime}ms`;
      }
    } else {
      health.status = 'error';
      health.responseTime = `${Date.now() - startTime}ms`;
    }

    const statusCode = health.status === 'ok' ? 200 : health.status === 'degraded' ? 503 : 500;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: error.message
    });
  }
});

// Detailed health check endpoint
router.get('/detailed', async (req, res) => {
  try {
    const mongoStatus = mongoose.connection.readyState;
    const connectionStatus = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    const detailed = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      server: {
        nodeVersion: process.version,
        platform: process.platform,
        memory: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      },
      database: {
        status: connectionStatus[mongoStatus],
        readyState: mongoStatus
      }
    };

    // Database metrics if connected
    if (mongoStatus === 1) {
      try {
        const Book = require('../models/Book');
        const Order = require('../models/Order');
        const RedemptionCode = require('../models/RedemptionCode');

        detailed.metrics = {
          users: await User.countDocuments(),
          books: await Book.countDocuments(),
          orders: await Order.countDocuments(),
          redemptionCodes: await RedemptionCode.countDocuments()
        };
      } catch (error) {
        detailed.database.error = error.message;
      }
    }

    const statusCode = detailed.database.status === 'connected' ? 200 : 503;
    res.status(statusCode).json(detailed);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: error.message
    });
  }
});

module.exports = router;
