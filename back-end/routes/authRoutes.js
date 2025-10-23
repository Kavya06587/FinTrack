const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const { 
  registerSchema, 
  loginSchema, 
  validateRequest 
} = require('../middleware/validation');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret-for-development-only';

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
};

// Register
router.post('/register', validateRequest(registerSchema), async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      email, 
      password, 
      phone, 
      securityQuestion, 
      securityAnswer,
      monthlyIncome 
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create new user
    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phone?.trim(),
      securityQuestion,
      securityAnswer,
      monthlyIncome: monthlyIncome || 0
    });

    // Generate token
    const token = generateToken(user._id);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        monthlyIncome: user.monthlyIncome,
        currency: user.currency,
        dashboardView: user.dashboardView
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user account'
    });
  }
});

// Login
router.post('/login', validateRequest(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user and include password for verification
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password +loginAttempts +lockUntil');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if account is locked
    if (user.isLocked()) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked. Please try again later.'
      });
    }

    // Verify password
    const isPasswordCorrect = await user.correctPassword(password);
    if (!isPasswordCorrect) {
      // Increment login attempts
      await user.incrementLoginAttempts();
      
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Reset login attempts on successful login
    await User.findByIdAndUpdate(user._id, {
      $set: { loginAttempts: 0, lastLogin: new Date() },
      $unset: { lockUntil: 1 }
    });

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        monthlyIncome: user.monthlyIncome,
        currency: user.currency,
        dashboardView: user.dashboardView,
        verified: user.verified,
        twoFactorEnabled: user.twoFactorEnabled
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during login'
    });
  }
});

// Verify token
router.get('/verify', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    res.json({
      success: true,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        monthlyIncome: user.monthlyIncome,
        currency: user.currency,
        dashboardView: user.dashboardView,
        verified: user.verified,
        twoFactorEnabled: user.twoFactorEnabled,
        notificationPreferences: user.notificationPreferences
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error verifying token'
    });
  }
});

// Logout
router.post('/logout', protect, async (req, res) => {
  try {
    // In a real application, you might want to blacklist the token
    // For now, we'll just return success
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error during logout'
    });
  }
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email, securityAnswer, newPassword } = req.body;

    if (!email || !securityAnswer || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, security answer, and new password are required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+securityAnswer');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify security answer
    const isSecurityAnswerCorrect = await user.correctSecurityAnswer(securityAnswer);
    if (!isSecurityAnswerCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect security answer'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password'
    });
  }
});

// Change password
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    const user = await User.findById(req.user._id).select('+password');
    
    // Verify current password
    const isCurrentPasswordCorrect = await user.correctPassword(currentPassword);
    if (!isCurrentPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password'
    });
  }
});

module.exports = router;