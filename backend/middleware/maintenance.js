const MaintenanceStatus = require('../models/MaintenanceStatus');

let cachedMaintenanceStatus = false;
let cacheTime = Date.now();
const CACHE_DURATION = 5000; // Cache for 5 seconds

const maintenanceMiddleware = async (req, res, next) => {
  try {
    // Check cache first
    if (Date.now() - cacheTime > CACHE_DURATION) {
      const maintenance = await MaintenanceStatus.getInstance();
      cachedMaintenanceStatus = maintenance.isEnabled;
      cacheTime = Date.now();
    }

    // Skip maintenance check for maintenance endpoint itself and admin API
    if (req.path.includes('/api/admin/maintenance') || req.path.includes('/maintenance.html')) {
      return next();
    }

    // If maintenance mode is enabled and user is not accessing API admin endpoints, redirect
    if (cachedMaintenanceStatus && !req.path.startsWith('/api/')) {
      return res.redirect('/maintenance.html');
    }

    // For API requests, return maintenance response
    if (cachedMaintenanceStatus && req.path.startsWith('/api/')) {
      return res.status(503).json({
        message: 'Service temporarily unavailable - maintenance mode enabled'
      });
    }

    next();
  } catch (error) {
    console.error('Maintenance middleware error:', error);
    next();
  }
};

module.exports = maintenanceMiddleware;
