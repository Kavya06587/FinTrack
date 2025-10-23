// server.js - Complete Backend for FinTrack
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const User = require('./models/User');
const loanRoutes = require('./routes/loanRoutes');
const financialRoutes=require('./routes/financialRoutes');
const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Enhanced CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5500',
      'http://127.0.0.1:5500',
      'file://',
      'null'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked for origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));
app.use('/api/loans', loanRoutes);
// Handle preflight requests
app.options('*', cors(corsOptions));
app.use('/api/financial',financialRoutes);
// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (for frontend)
app.use(express.static('../front-end'));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fintrack';
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB Connected successfully'))
.catch(err => {
  console.error('❌ MongoDB Connection Error:', err);
  process.exit(1);
});

// User model and schema are defined in ./models/User.js and imported at top of this file.

// Auth middleware
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password -securityAnswer');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Token is invalid.'
      });
    }
    
    if (user.isLocked()) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to too many failed login attempts.'
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please login again.'
      });
    }
    
    res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// ==================== ROUTES ====================

// Health check and root route
app.get('/', (req, res) => {
  res.json({ 
    success: true,
    message: '🚀 FinTrack Backend API is running!',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      financial: '/api/financial',
      transactions: '/api/transactions',
      budgets: '/api/budgets',
      goals: '/api/goals',
      profile: '/api/profile',
      settings: '/api/settings'
    }
  });
});

app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
  res.json({ 
    success: true,
    message: '✅ Server is healthy',
    database: dbStatus,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// ==================== AUTH ROUTES ====================

app.post('/api/auth/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, securityQuestion, securityAnswer, monthlyIncome, phone } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !password || !securityQuestion || !securityAnswer) {
      return res.status(400).json({
        success: false,
        message: 'All required fields are missing'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      password,
      securityQuestion,
      securityAnswer,
      monthlyIncome: monthlyIncome || 0,
      currency: 'INR',
      phone: phone || ''
    });

    // Generate token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '30d' });

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
        dashboardView: user.dashboardView,
        notificationPreferences: user.notificationPreferences
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists'
      });
    }
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error creating user account'
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password +loginAttempts +lockUntil');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if account is locked
    if (user.isLocked()) {
      const lockTime = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
      return res.status(423).json({
        success: false,
        message: `Account is temporarily locked. Try again in ${lockTime} minutes.`
      });
    }

    // Verify password
    const isPasswordCorrect = await user.correctPassword(password);
    if (!isPasswordCorrect) {
      // Simple login attempt tracking using targeted update to avoid full-document validation
      const newLoginAttempts = (user.loginAttempts || 0) + 1;
      const update = { $set: { loginAttempts: newLoginAttempts } };
      if (newLoginAttempts >= 5) {
        update.$set.lockUntil = Date.now() + 2 * 60 * 60 * 1000; // 2 hours
      }

      try {
        await User.findByIdAndUpdate(user._id, update, { runValidators: false });
      } catch (updErr) {
        console.error('Failed to update loginAttempts:', updErr);
      }

      const attemptsLeft = 5 - newLoginAttempts;
      return res.status(401).json({
        success: false,
        message: `Invalid email or password. ${attemptsLeft > 0 ? `${attemptsLeft} attempts remaining.` : 'Account will be locked.'}`
      });
    }

    // Reset login attempts and update lastLogin on successful login using targeted update
    try {
      await User.findByIdAndUpdate(user._id, {
        $set: { lastLogin: new Date(), loginAttempts: 0 },
        $unset: { lockUntil: 1 }
      }, { runValidators: false });
    } catch (updErr) {
      console.error('Failed to update lastLogin/loginAttempts:', updErr);
    }

    // Generate token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '30d' });

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
        notificationPreferences: user.notificationPreferences,
        twoFactorEnabled: user.twoFactorEnabled
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    // Log stack for easier debugging
    if (error && error.stack) console.error(error.stack);

    // If validation error, return details to help debug invalid document updates
    if (error && error.name === 'ValidationError') {
      const errors = Object.values(error.errors || {}).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error during login',
        errors
      });
    }

    const isProd = process.env.NODE_ENV === 'production';
    const message = isProd ? 'Error during login' : (error && error.message) || 'Error during login';

    return res.status(500).json({
      success: false,
      message,
      ...(isProd ? {} : { stack: error && error.stack })
    });
  }
});

app.get('/api/auth/verify', authMiddleware, async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        _id: req.user._id,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email,
        monthlyIncome: req.user.monthlyIncome,
        currency: req.user.currency,
        dashboardView: req.user.dashboardView,
        verified: req.user.verified,
        notificationPreferences: req.user.notificationPreferences,
        phone: req.user.phone,
        profilePicture: req.user.profilePicture,
        twoFactorEnabled: req.user.twoFactorEnabled,
        createdAt: req.user.createdAt
      }
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying token'
    });
  }
});

app.post('/api/auth/logout', authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

app.put('/api/auth/change-password', authMiddleware, async (req, res) => {
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
    user.lastPasswordChange = new Date();
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

// ==================== TRANSACTIONS ROUTES ====================

app.get('/api/transactions', authMiddleware, async (req, res) => {
  try {
    const { type, category, page = 1, limit = 10 } = req.query;
    
    let transactions = [...req.user.transactions];
    
    // Apply filters
    if (type) {
      transactions = transactions.filter(t => t.type === type);
    }
    
    if (category) {
      transactions = transactions.filter(t => 
        t.category.toLowerCase().includes(category.toLowerCase())
      );
    }
    
    // Sort by date (newest first)
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedTransactions = transactions.slice(startIndex, endIndex);
    
    // Calculate totals
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    res.json({
      success: true,
      transactions: paginatedTransactions,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(transactions.length / limit),
        totalTransactions: transactions.length,
        hasNext: endIndex < transactions.length,
        hasPrev: page > 1
      },
      totals: {
        income: totalIncome,
        expenses: totalExpenses,
        net: totalIncome - totalExpenses
      }
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching transactions'
    });
  }
});

app.post('/api/transactions', authMiddleware, async (req, res) => {
  try {
    const { type, category, amount, description, date } = req.body;

    console.log('Received transaction data:', req.body);

    // Validation
    if (!type || !category || !amount || !description) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    if (type !== 'income' && type !== 'expense') {
      return res.status(400).json({
        success: false,
        message: 'Type must be either income or expense'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }

    const transaction = {
      type,
      category: category.trim(),
      amount: parseFloat(amount),
      description: description.trim(),
      date: date ? new Date(date) : new Date()
    };

    // Validate date is not in future
    if (transaction.date > new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Transaction date cannot be in the future'
      });
    }

    // Add transaction to user
    req.user.transactions.push(transaction);
    await req.user.save();

    // Get the newly added transaction (last one in array)
    const newTransaction = req.user.transactions[req.user.transactions.length - 1];

    console.log('Transaction added successfully:', newTransaction);

    res.status(201).json({
      success: true,
      message: 'Transaction added successfully',
      transaction: newTransaction
    });

  } catch (error) {
    console.error('Add transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding transaction: ' + error.message
    });
  }
});

app.delete('/api/transactions/:transactionId', authMiddleware, async (req, res) => {
  try {
    const { transactionId } = req.params;

    console.log('Deleting transaction:', transactionId);

    const transactionIndex = req.user.transactions.findIndex(
      t => t._id.toString() === transactionId
    );
    
    if (transactionIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    req.user.transactions.splice(transactionIndex, 1);
    await req.user.save();

    res.json({
      success: true,
      message: 'Transaction deleted successfully'
    });

  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting transaction'
    });
  }
});

// ==================== BUDGETS ROUTES ====================

app.get('/api/budgets', authMiddleware, async (req, res) => {
  try {
    // Calculate current spending for each budget
    const monthlySpending = req.user.getMonthlySpending();
    const budgetsWithSpending = req.user.budgets.map(budget => {
      const spent = monthlySpending[budget.category] || 0;
      return {
        ...budget.toObject(),
        spent,
        percentage: budget.limit > 0 ? (spent / budget.limit) * 100 : 0
      };
    });

    res.json({
      success: true,
      budgets: budgetsWithSpending
    });
  } catch (error) {
    console.error('Get budgets error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching budgets'
    });
  }
});

app.post('/api/budgets', authMiddleware, async (req, res) => {
  try {
    const { category, limit, period, description, alerts } = req.body;

    if (!category || !limit) {
      return res.status(400).json({
        success: false,
        message: 'Category and limit are required'
      });
    }

    if (limit <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Budget limit must be greater than 0'
      });
    }

    // Check if budget already exists for this category
    const existingBudget = req.user.budgets.find(b => b.category === category);
    if (existingBudget) {
      return res.status(409).json({
        success: false,
        message: 'Budget already exists for this category'
      });
    }

    const budget = {
      category: category.trim(),
      limit: parseFloat(limit),
      period: period || 'monthly',
      description: description || '',
      alerts: alerts !== false,
      spent: 0,
      _id: new mongoose.Types.ObjectId().toString()
    };

    req.user.budgets.push(budget);
    await req.user.save();

    const newBudget = req.user.budgets[req.user.budgets.length - 1];

    res.status(201).json({
      success: true,
      message: 'Budget created successfully',
      budget: newBudget
    });

  } catch (error) {
    console.error('Create budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating budget'
    });
  }
});

app.put('/api/budgets/:budgetId', authMiddleware, async (req, res) => {
  try {
    const { budgetId } = req.params;
    const { limit, period, description, alerts } = req.body;

    const budget = req.user.budgets.find(b => b._id === budgetId);
    
    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    // Update budget fields
    if (limit !== undefined) {
      if (limit <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Budget limit must be greater than 0'
        });
      }
      budget.limit = parseFloat(limit);
    }
    
    if (period) budget.period = period;
    if (description !== undefined) budget.description = description;
    if (alerts !== undefined) budget.alerts = alerts;

    await req.user.save();

    res.json({
      success: true,
      message: 'Budget updated successfully',
      budget
    });

  } catch (error) {
    console.error('Update budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating budget'
    });
  }
});

app.delete('/api/budgets/:budgetId', authMiddleware, async (req, res) => {
  try {
    const { budgetId } = req.params;

    const budgetIndex = req.user.budgets.findIndex(b => b._id === budgetId);
    
    if (budgetIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    req.user.budgets.splice(budgetIndex, 1);
    await req.user.save();

    res.json({
      success: true,
      message: 'Budget deleted successfully'
    });

  } catch (error) {
    console.error('Delete budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting budget'
    });
  }
});

app.get('/api/budgets/categories', authMiddleware, async (req, res) => {
  try {
    const categories = [
      'Food & Dining',
      'Groceries',
      'Transportation',
      'Entertainment',
      'Bills & Utilities',
      'Healthcare',
      'Education',
      'Shopping',
      'Travel',
      'EMI & Loans',
      'Investments',
      'Insurance',
      'Rent',
      'Fuel',
      'Mobile & Internet',
      'Personal Care',
      'Gifts & Donations',
      'Other'
    ];

    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories'
    });
  }
});

// ==================== GOALS ROUTES ====================

app.get('/api/goals', authMiddleware, async (req, res) => {
  try {
    res.json({
      success: true,
      goals: req.user.financialGoals
    });
  } catch (error) {
    console.error('Get goals error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching goals'
    });
  }
});

app.post('/api/goals', authMiddleware, async (req, res) => {
  try {
    const { title, targetAmount, deadline, category, priority } = req.body;

    if (!title || !targetAmount || !deadline) {
      return res.status(400).json({
        success: false,
        message: 'Title, target amount, and deadline are required'
      });
    }

    if (targetAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Target amount must be greater than 0'
      });
    }

    if (new Date(deadline) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Deadline must be in the future'
      });
    }

    const goal = {
      title: title.trim(),
      targetAmount: parseFloat(targetAmount),
      currentAmount: 0,
      deadline: new Date(deadline),
      category: category || 'savings',
      priority: priority || 'medium',
      completed: false,
      _id: new mongoose.Types.ObjectId().toString()
    };

    req.user.financialGoals.push(goal);
    await req.user.save();

    const newGoal = req.user.financialGoals[req.user.financialGoals.length - 1];

    res.status(201).json({
      success: true,
      message: 'Goal created successfully',
      goal: newGoal
    });

  } catch (error) {
    console.error('Create goal error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating goal'
    });
  }
});

app.post('/api/goals/:goalId/contribute', authMiddleware, async (req, res) => {
  try {
    const { goalId } = req.params;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid contribution amount is required'
      });
    }

    const goal = req.user.financialGoals.id(goalId);
    
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }

    // Add contribution
    goal.currentAmount += parseFloat(amount);
    
    // Auto-complete if target is reached
    if (goal.currentAmount >= goal.targetAmount) {
      goal.completed = true;
      goal.currentAmount = goal.targetAmount; // Prevent over-contribution
    }

    await req.user.save();

    res.json({
      success: true,
      message: 'Contribution added successfully',
      goal,
      contribution: {
        amount: parseFloat(amount),
        newTotal: goal.currentAmount,
        progress: (goal.currentAmount / goal.targetAmount) * 100,
        completed: goal.completed
      }
    });

  } catch (error) {
    console.error('Contribute to goal error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding contribution'
    });
  }
});

app.post('/api/goals/retirement-calculate', authMiddleware, async (req, res) => {
  try {
    const { 
      currentAge, 
      retirementAge, 
      currentSavings, 
      desiredCorpus, 
      expectedReturn,
      inflationRate,
      retirementSpending,
      socialSecurity 
    } = req.body;

    // Validate inputs
    if (retirementAge <= currentAge) {
      return res.status(400).json({
        success: false,
        message: 'Retirement age must be greater than current age'
      });
    }

    const yearsToRetirement = retirementAge - currentAge;
    const monthlyReturn = expectedReturn / 12 / 100;
    const monthsToRetirement = yearsToRetirement * 12;

    // Calculate future value of current savings
    const futureValueOfCurrentSavings = currentSavings * Math.pow(1 + expectedReturn/100, yearsToRetirement);

    // Calculate monthly investment needed
    const futureValueNeeded = desiredCorpus - futureValueOfCurrentSavings;
    
    let monthlyInvestment = 0;
    if (futureValueNeeded > 0) {
      monthlyInvestment = futureValueNeeded * (monthlyReturn) / (Math.pow(1 + monthlyReturn, monthsToRetirement) - 1);
    }

    // Adjust for inflation
    const futureRetirementSpending = retirementSpending * Math.pow(1 + inflationRate/100, yearsToRetirement);
    const annualRetirementIncome = desiredCorpus * 0.04; // 4% rule
    const incomeGap = futureRetirementSpending - (annualRetirementIncome + socialSecurity);

    const calculation = {
      monthlyInvestment: Math.max(0, monthlyInvestment),
      totalInvestment: monthlyInvestment * monthsToRetirement,
      yearsToRetirement,
      futureValueOfCurrentSavings,
      futureRetirementSpending,
      annualRetirementIncome,
      incomeGap,
      readinessPercentage: Math.min(100, ((annualRetirementIncome + socialSecurity) / futureRetirementSpending) * 100)
    };

    res.json({
      success: true,
      calculation
    });

  } catch (error) {
    console.error('Retirement calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating retirement plan'
    });
  }
});

// ==================== FINANCIAL OVERVIEW ROUTES ====================

app.get('/api/financial/overview', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      console.warn('Financial overview: user not found', { userId: req.user && req.user._id });
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Defensive: ensure arrays exist and date fields are Date objects
    user.transactions = Array.isArray(user.transactions) ? user.transactions.map(t => {
      try {
        // If t.date is a string, coerce to Date
        return { ...t.toObject ? t.toObject() : t, date: t.date ? new Date(t.date) : new Date() };
      } catch (e) {
        return { ...t, date: t.date ? new Date(t.date) : new Date() };
      }
    }) : [];
    user.budgets = Array.isArray(user.budgets) ? user.budgets : [];
    user.financialGoals = Array.isArray(user.financialGoals) ? user.financialGoals : [];

    const financialData = user.getFinancialOverview();

    // Enhanced analytics
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    // Monthly trends for the last 6 months
    const monthlyTrends = [];
    for (let i = 0; i < 6; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.getMonth();
      const year = date.getFullYear();
      const monthName = date.toLocaleString('default', { month: 'short' });

      const monthlyData = user.getMonthlySpending(month, year);
      const monthlyIncome = user.transactions
        .filter(t => t.type === 'income' && 
                t.date.getMonth() === month && 
                t.date.getFullYear() === year)
        .reduce((sum, t) => sum + t.amount, 0);

      monthlyTrends.unshift({
        month: monthName,
        income: monthlyIncome,
        expenses: Object.values(monthlyData).reduce((sum, amount) => sum + amount, 0),
        savings: monthlyIncome - Object.values(monthlyData).reduce((sum, amount) => sum + amount, 0)
      });
    }

    // Calculate financial health metrics
    const savingsRate = user.getSavingsRate();
    const emergencyFundMonths = user.getEmergencyFundMonths();
    const debtToIncome = user.getDebtToIncomeRatio();
    const averageGoalProgress = user.getAverageGoalProgress();
    const healthScore = user.getFinancialHealthScore();
    const savingsConsistency = user.calculateSavingsConsistency();
    const avgMonthlyIncome = user.calculateAverageMonthlyIncome();
    const avgMonthlyExpenses = user.calculateAverageMonthlyExpenses();

    res.json({
      success: true,
      ...financialData,
      analytics: {
        monthlyTrends,
        savingsRate,
        emergencyFundMonths,
        debtToIncome,
        averageGoalProgress,
        healthScore,
        activeBudgets: financialData.budgetStatus.length,
        activeGoals: financialData.goalsProgress.filter(g => !g.completed).length,
        savingsConsistency,
        avgMonthlyIncome,
        avgMonthlyExpenses
      }
    });
  } catch (error) {
    console.error('Financial overview error:', error);
    if (error && error.stack) console.error(error.stack);

    const isProd = process.env.NODE_ENV === 'production';
    const message = isProd ? 'Error fetching financial overview' : (error && error.message) || 'Error fetching financial overview';

    return res.status(500).json({
      success: false,
      message,
      ...(isProd ? {} : { stack: error && error.stack })
    });
  }
});

// ==================== PROFILE ROUTES ====================

app.put('/api/profile', authMiddleware, async (req, res) => {
  try {
    const { firstName, lastName, monthlyIncome, currency, phone, dashboardView, notificationPreferences } = req.body;

    const updates = {};
    
    if (firstName) updates.firstName = firstName.trim();
    if (lastName) updates.lastName = lastName.trim();
    if (monthlyIncome !== undefined) updates.monthlyIncome = parseFloat(monthlyIncome);
    if (currency) updates.currency = currency;
    if (phone) updates.phone = phone.trim();
    if (dashboardView) updates.dashboardView = dashboardView;
    if (notificationPreferences) updates.notificationPreferences = notificationPreferences;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password -securityAnswer');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile'
    });
  }
});

app.put('/api/profile/picture', authMiddleware, async (req, res) => {
  try {
    const { profilePicture } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { profilePicture } },
      { new: true }
    ).select('-password -securityAnswer');

    res.json({
      success: true,
      message: 'Profile picture updated successfully',
      user
    });

  } catch (error) {
    console.error('Update profile picture error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile picture'
    });
  }
});

app.put('/api/profile/two-factor', authMiddleware, async (req, res) => {
  try {
    const { enabled } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { twoFactorEnabled: enabled } },
      { new: true }
    ).select('-password -securityAnswer');

    res.json({
      success: true,
      message: `Two-factor authentication ${enabled ? 'enabled' : 'disabled'}`,
      user
    });

  } catch (error) {
    console.error('Update two-factor error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating two-factor authentication'
    });
  }
});

// ==================== SETTINGS ROUTES ====================

app.get('/api/settings', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    res.json({
      success: true,
      settings: {
        account: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          monthlyIncome: user.monthlyIncome,
          currency: user.currency
        },
        preferences: {
          dashboardView: user.dashboardView,
          notificationPreferences: user.notificationPreferences
        },
        security: {
          twoFactorEnabled: user.twoFactorEnabled,
          lastPasswordChange: user.lastPasswordChange
        }
      }
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching settings'
    });
  }
});

app.put('/api/settings', authMiddleware, async (req, res) => {
  try {
    const { account, preferences, security } = req.body;
    const updates = {};

    if (account) {
      if (account.firstName) updates.firstName = account.firstName;
      if (account.lastName) updates.lastName = account.lastName;
      if (account.email) updates.email = account.email.toLowerCase();
      if (account.phone) updates.phone = account.phone;
      if (account.monthlyIncome !== undefined) updates.monthlyIncome = account.monthlyIncome;
      if (account.currency) updates.currency = account.currency;
    }

    if (preferences) {
      if (preferences.dashboardView) updates.dashboardView = preferences.dashboardView;
      if (preferences.notificationPreferences) {
        updates.notificationPreferences = {
          ...req.user.notificationPreferences,
          ...preferences.notificationPreferences
        };
      }
    }

    if (security && security.twoFactorEnabled !== undefined) {
      updates.twoFactorEnabled = security.twoFactorEnabled;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password -securityAnswer');

    res.json({
      success: true,
      message: 'Settings updated successfully',
      user
    });

  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating settings'
    });
  }
});

// ==================== 404 HANDLER ====================

app.use('*', (req, res) => {
  console.log('404 - Route not found:', req.originalUrl);
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    availableEndpoints: [
      'GET /',
      'GET /api/health',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/auth/verify',
      'POST /api/auth/logout',
      'PUT /api/auth/change-password',
      'GET /api/transactions',
      'POST /api/transactions',
      'DELETE /api/transactions/:id',
      'GET /api/budgets',
      'POST /api/budgets',
      'PUT /api/budgets/:id',
      'DELETE /api/budgets/:id',
      'GET /api/budgets/categories',
      'GET /api/financial/overview',
      'GET /api/goals',
      'POST /api/goals',
      'POST /api/goals/:id/contribute',
      'POST /api/goals/retirement-calculate',
      'PUT /api/profile',
      'PUT /api/profile/picture',
      'PUT /api/profile/two-factor',
      'GET /api/settings',
      'PUT /api/settings'
    ]
  });
});

// ==================== GLOBAL ERROR HANDLER ====================

app.use((error, req, res, next) => {
  console.error('🚨 Global Error Handler:', error);
  
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }
  
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }
  
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy: Access not allowed from this origin'
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Internal Server Error'
  });
});

// ==================== START SERVER ====================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 FinTrack Server running on port ${PORT}`);
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`🌐 Network: http://0.0.0.0:${PORT}`);
  console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`💾 Database: ${MONGODB_URI}`);
  console.log('\n📋 Available Endpoints:');
  console.log('  🔐 Auth:');
  console.log('    POST /api/auth/register');
  console.log('    POST /api/auth/login');
  console.log('    GET  /api/auth/verify');
  console.log('    POST /api/auth/logout');
  console.log('    PUT  /api/auth/change-password');
  console.log('  💰 Transactions:');
  console.log('    GET  /api/transactions');
  console.log('    POST /api/transactions');
  console.log('    DELETE /api/transactions/:id');
  console.log('  📊 Budgets:');
  console.log('    GET  /api/budgets');
  console.log('    POST /api/budgets');
  console.log('    PUT  /api/budgets/:id');
  console.log('    DELETE /api/budgets/:id');
  console.log('    GET  /api/budgets/categories');
  console.log('  📈 Financial:');
  console.log('    GET /api/financial/overview');
  console.log('  🎯 Goals:');
  console.log('    GET  /api/goals');
  console.log('    POST /api/goals');
  console.log('    POST /api/goals/:id/contribute');
  console.log('    POST /api/goals/retirement-calculate');
  console.log('  👤 Profile:');
  console.log('    PUT /api/profile');
  console.log('    PUT /api/profile/picture');
  console.log('    PUT /api/profile/two-factor');
  console.log('  ⚙️  Settings:');
  console.log('    GET /api/settings');
  console.log('    PUT /api/settings');
});