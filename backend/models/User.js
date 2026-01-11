const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: /.+\@.+\..+/
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  checks: {
    type: Number,
    default: 0,
    min: 0
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  // Unlimited subscription fields
  isUnlimited: {
    type: Boolean,
    default: false
  },
  unlimitedSettings: {
    dailyCredits: {
      type: Number,
      default: 0
    },
    subscriptionDaysRemaining: {
      type: Number,
      default: 0
    },
    subscriptionStartDate: {
      type: Date,
      default: null
    },
    creditsResetAt: {
      type: Date,
      default: null
    },
    dailyCreditsUsedToday: {
      type: Number,
      default: 0
    }
  },
  adminPrivateNotes: {
    type: String,
    default: ''
  },
  // Password reset fields
  passwordResetToken: {
    type: String,
    default: null
  },
  passwordResetExpires: {
    type: Date,
    default: null
  },
  lastPasswordReset: {
    type: Date,
    default: null
  },
  lastPasswordResetEmailSent: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
