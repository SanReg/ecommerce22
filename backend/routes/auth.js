const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Resend } = require('resend');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    user = new User({ username, email, password, isAdmin: false });
    await user.save();
    
    const token = jwt.sign(
      { userId: user._id, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        checks: user.checks,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    
    const isMatch = await user.comparePassword(String(password));
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    
    const token = jwt.sign(
      { userId: user._id, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        checks: user.checks,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Change Password
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New passwords do not match' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await user.comparePassword(String(oldPassword));
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Forgot Password - Send Reset Email
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      // For security, don't reveal if email exists
      return res.status(200).json({ 
        message: 'If an account exists with this email, a password reset link has been sent' 
      });
    }

    // Check if user has requested password reset email within last 24 hours
    if (user.lastPasswordResetEmailSent) {
      const hoursSinceLastEmail = (Date.now() - user.lastPasswordResetEmailSent.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastEmail < 24) {
        return res.status(429).json({ 
          message: `You can only request a password reset email once per day. If you have not changed password with the previous email link, then you can still use that to change the password. If not, please try again in ${Math.ceil(24 - hoursSinceLastEmail)} hours or contact Support!`
        });
      }
    }

    // Generate reset token (valid for 24 hours)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    user.passwordResetToken = resetTokenHash;
    user.passwordResetExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    user.lastPasswordResetEmailSent = new Date();
    await user.save();

    // Create reset link
    const resetLink = `${process.env.FRONTEND_URL}/reset-password.html?token=${resetToken}&email=${encodeURIComponent(normalizedEmail)}`;

    // Send email via Resend
    try {
      const emailResponse = await resend.emails.send({
        from: 'noreply@checkmypaper.net',
        to: normalizedEmail,
        subject: 'Password Reset Request - CheckMyPaper',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #6366f1 0%, #06b6d4 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
              .header h1 { margin: 0; font-size: 24px; }
              .content { padding: 30px; color: #333; }
              .content p { line-height: 1.6; margin: 15px 0; }
              .button-container { text-align: center; margin: 30px 0; }
              .reset-button { 
                display: inline-block; 
                padding: 12px 30px; 
                background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
                color: #ffffff !important; 
                text-decoration: none; 
                border-radius: 6px; 
                font-weight: 600;
                transition: all 0.3s ease;
              }
              .reset-button:hover { color: #ffffff !important; transform: translateY(-2px); box-shadow: 0 10px 20px rgba(99, 102, 241, 0.3); }
              .footer { background-color: #f5f5f5; padding: 20px; text-align: center; color: #666; font-size: 12px; border-radius: 0 0 8px 8px; }
              .warning { color: #e85d75; margin: 20px 0; padding: 15px; background-color: #ffe8ec; border-left: 4px solid #e85d75; border-radius: 4px; }
              .token-info { background-color: #f0f4ff; padding: 15px; border-radius: 6px; margin: 15px 0; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔐 Password Reset Request</h1>
              </div>
              <div class="content">
                <p>Hello,</p>
                <p>We received a request to reset your password for your CheckMyPaper account. Click the button below to reset your password.</p>
                
                <div class="button-container">
                  <a href="${resetLink}" class="reset-button">Reset Password</a>
                </div>

                <p style="text-align: center; color: #666; font-size: 14px;">Or copy this link:</p>
                <div class="token-info">
                  <p style="margin: 0; word-break: break-all;">${resetLink}</p>
                </div>

                <div class="warning">
                  ⚠️ This link will expire in 24 hours for security reasons.
                </div>

                <p>If you didn't request this password reset, please ignore this email or contact our support team.</p>
                
                <p>Best regards,<br><strong>CheckMyPaper Team</strong></p>
              </div>
              <div class="footer">
                <p>© 2024 CheckMyPaper. All rights reserved.</p>
                <p>This is an automated email, please do not reply directly.</p>
              </div>
            </div>
          </body>
          </html>
        `
      });

      res.status(200).json({ 
        message: 'If an account exists with this email, a password reset link has been sent' 
      });
    } catch (emailError) {
      console.error('Resend API error:', emailError);
      // Still return success for security
      res.status(200).json({ 
        message: 'If an account exists with this email, a password reset link has been sent' 
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Reset Password - Verify Token and Reset
router.post('/reset-password', async (req, res) => {
  try {
    const { token, email, newPassword, confirmPassword } = req.body;

    if (!token || !email || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    
    // Hash the token to compare
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({ 
      email: normalizedEmail,
      passwordResetToken: resetTokenHash,
      passwordResetExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired password reset link' });
    }

    // Update password and set last reset timestamp
    user.password = newPassword;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    user.lastPasswordReset = new Date();
    await user.save();

    res.json({ message: 'Password has been reset successfully. You can now login with your new password.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
