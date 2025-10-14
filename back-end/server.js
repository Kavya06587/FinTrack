const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Import database connection and User model
const connectDB = require('./config/database');
const User = require('./models/User');

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// JWT Secret (add this to your .env file)
const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_jwt_secret_here';

// Basic route - Test if server is working
app.get('/', (req, res) => {
  res.json({ 
    message: 'FinTrack Backend is running!',
    timestamp: new Date().toISOString()
  });
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString()
  });
});

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      email, 
      password, 
      phone, 
      securityQuestion, 
      securityAnswer,
      monthlyIncome,
      financialGoals,
      notificationPreferences,
      dashboardView
    } = req.body;

    console.log('Registration attempt:', { email, firstName, lastName });

    // Basic validation
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create new user (password will be automatically hashed by the pre-save middleware)
    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password, // This will be hashed automatically
      phone: phone || '',
      securityQuestion,
      securityAnswer,
      monthlyIncome: monthlyIncome || 0,
      financialGoals: financialGoals || [],
      notificationPreferences: notificationPreferences || {
        billReminders: true,
        budgetAlerts: true,
        investmentUpdates: true,
        marketingNewsletters: false
      },
      dashboardView: dashboardView || 'simple'
    });

    console.log('New user registered:', newUser.email);

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser._id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return success (without password)
    const userResponse = newUser.toObject();
    delete userResponse.password;
    
    res.status(201).json({
      success: true,
      message: 'Registration successful!',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle duplicate email error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'User already exists with this email'
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error during registration'
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    console.log('Login attempt:', { email, rememberMe });

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user in MongoDB (include password for comparison)
    const user = await User.findOne({ email }).select('+password');
    
    console.log('Found user:', user ? user.email : 'No user found');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password using bcrypt
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    
    console.log('Password comparison result:', isPasswordCorrect);
    
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    console.log('Login successful for:', user.email);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: rememberMe ? '30d' : '7d' }
    );

    // Return user data without password
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: userResponse,
      rememberMe: rememberMe || false
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login'
    });
  }
});

// Get all users (for testing - remove in production)
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 }); // Exclude passwords
    res.json({
      success: true,
      users: users,
      count: users.length
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
});

// Get single user by ID (for testing)
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id, { password: 0 });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    res.json({
      success: true,
      user: user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
  console.log(`📊 MongoDB: Connected to fintrack database`);
  console.log(`🔐 Auth routes:`);
  console.log(`   - POST http://localhost:${PORT}/api/auth/register`);
  console.log(`   - POST http://localhost:${PORT}/api/auth/login`);
  console.log(`👥 User routes (for testing):`);
  console.log(`   - GET  http://localhost:${PORT}/api/users`);
  console.log(`   - GET  http://localhost:${PORT}/api/users/:id`);
});