const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const path = require('path');
const cron = require('node-cron');
const User = require('./models/User');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());
app.use(express.static(path.join(__dirname, '../frontend'), { index: false }));
// Backward compatibility: serve existing local uploads if present
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/checks', require('./routes/checks'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/packages', require('./routes/packages'));
app.use('/api/service', require('./routes/serviceStatus'));
app.use('/api/unlimited', require('./routes/unlimited'));
app.use('/health', require('./routes/health'));

// Serve HTML files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/home.html'));
});

app.get('/home.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/home.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/admin/dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/admin/dashboard.html'));
});

// 404 fallback for unknown API routes - return JSON, not HTML
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'Not found', path: req.originalUrl });
  }
  next();
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Server error', error: err.message });
});

// Automatic daily reset for unlimited users - runs at UTC 0:00 every day
async function processUnlimitedUsersReset() {
  try {
    console.log('[CRON] Starting daily unlimited users reset at', new Date().toISOString());
    
    const unlimitedUsers = await User.find({ isUnlimited: true });
    let processed = 0;
    let converted = 0;

    for (const user of unlimitedUsers) {
      const now = new Date();
      
      // Initialize creditsResetAt if missing
      if (!user.unlimitedSettings.creditsResetAt) {
        const nextReset = new Date(now);
        nextReset.setUTCHours(24, 0, 0, 0);
        user.unlimitedSettings.creditsResetAt = nextReset;
      }

      // Apply all missed resets (handles users who didn't log in)
      while (user.isUnlimited && now > new Date(user.unlimitedSettings.creditsResetAt)) {
        user.unlimitedSettings.dailyCreditsUsedToday = 0;
        
        // Move reset window to next midnight
        const nextReset = new Date(user.unlimitedSettings.creditsResetAt);
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
      }

      await user.save();
      processed++;
    }

    console.log(`[CRON] Daily reset completed: ${processed} users processed, ${converted} expired and converted to normal`);
  } catch (error) {
    console.error('[CRON] Error processing daily reset:', error);
  }
}

// Schedule cron job to run at UTC 0:00 every day (format: second minute hour day month weekday)
cron.schedule('0 0 * * *', processUnlimitedUsersReset, {
  timezone: 'UTC'
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Frontend: http://localhost:${PORT}');
  console.log('Admin Dashboard: http://localhost:${PORT}/admin/dashboard.html');
  console.log('[CRON] Automatic daily reset scheduled for UTC 0:00');
});
