const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: true
  },
  category: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  amount: {
    type: Number,
    required: true,
    min: [0.01, 'Amount must be greater than 0'],
    max: [1000000, 'Amount too large']
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  date: {
    type: Date,
    default: Date.now,
    validate: {
      validator: function(date) {
        return date <= new Date();
      },
      message: 'Transaction date cannot be in the future'
    }
  },
  recurring: {
    type: Boolean,
    default: false
  },
  recurringFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    default: 'monthly'
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 30
  }]
}, {
  timestamps: true
});

const budgetSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  limit: {
    type: Number,
    required: true,
    min: [0, 'Budget limit cannot be negative']
  },
  period: {
    type: String,
    enum: ['weekly', 'monthly', 'yearly'],
    default: 'monthly'
  },
  alerts: {
    type: Boolean,
    default: true
  },
  alertThreshold: {
    type: Number,
    default: 80,
    min: 0,
    max: 100
  }
}, {
  timestamps: true
});

// In User.js - Make sure this goal schema exists
const goalSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  targetAmount: {
    type: Number,
    required: true,
    min: [1, 'Target amount must be at least 1']
  },
  currentAmount: {
    type: Number,
    default: 0,
    min: [0, 'Current amount cannot be negative']
  },
  deadline: {
    type: Date,
    required: true,
    validate: {
      validator: function(date) {
        return date > new Date();
      },
      message: 'Deadline must be in the future'
    }
  },
  category: {
    type: String,
    default: 'savings',
    enum: ['savings', 'investment', 'debt', 'purchase', 'emergency', 'education', 'retirement', 'travel', 'home', 'vehicle', 'other']
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  completed: {
    type: Boolean,
    default: false
  },
  description: String,
  monthlyContribution: Number,
  alerts: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const investmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['stock', 'mutual_fund', 'etf', 'bond', 'crypto', 'real_estate', 'other'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  purchaseDate: {
    type: Date,
    default: Date.now
  },
  currentValue: {
    type: Number,
    min: 0
  },
  returns: {
    type: Number,
    default: 0
  }
});

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    minlength: [2, 'First name must be at least 2 characters'],
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    minlength: [2, 'Last name must be at least 2 characters'],
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  phone: {
    type: String,
    trim: true,
    match: [/^\+?[\d\s\-()]+$/, 'Please enter a valid phone number']
  },
  securityQuestion: {
    type: String,
    required: [true, 'Security question is required']
  },
  securityAnswer: {
    type: String,
    required: [true, 'Security answer is required'],
    select: false
  },
  monthlyIncome: {
    type: Number,
    default: 0,
    min: [0, 'Monthly income cannot be negative'],
    max: [1000000, 'Monthly income too large']
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD']
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  // Enhanced financial data
  transactions: [transactionSchema],
  budgets: [budgetSchema],
  financialGoals: [goalSchema],
  investments: [investmentSchema],
  
  // Preferences
  notificationPreferences: {
    billReminders: { type: Boolean, default: true },
    budgetAlerts: { type: Boolean, default: true },
    investmentUpdates: { type: Boolean, default: true },
    marketingNewsletters: { type: Boolean, default: false },
    expenseReports: { type: Boolean, default: true },
    securityAlerts: { type: Boolean, default: true }
  },
  
  dashboardView: {
    type: String,
    enum: ['simple', 'detailed', 'advanced'],
    default: 'simple'
  },
  
  // Security
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  
  // Profile
  profilePicture: String,
  bio: {
    type: String,
    maxlength: 500
  },
  
  // Verification
  verified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  
  // Analytics
  financialHealthScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ 'transactions.date': -1 });
userSchema.index({ 'financialGoals.deadline': 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Hash security answer before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('securityAnswer')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.securityAnswer = await bcrypt.hash(this.securityAnswer, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Methods
userSchema.methods.correctPassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.correctSecurityAnswer = async function(candidateAnswer) {
  return await bcrypt.compare(candidateAnswer, this.securityAnswer);
};

// Check if account is locked
userSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Increment login attempts
userSchema.methods.incrementLoginAttempts = function() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  return this.updateOne(updates);
};

// Financial calculations
userSchema.methods.getTotalBalance = function() {
  const income = this.transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const expenses = this.transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  return income - expenses;
};

userSchema.methods.getMonthlySpending = function(month = new Date().getMonth(), year = new Date().getFullYear()) {
  const monthlyExpenses = this.transactions.filter(t => 
    t.type === 'expense' && 
    t.date.getMonth() === month && 
    t.date.getFullYear() === year
  );
  
  return monthlyExpenses.reduce((acc, t) => {
    const cat = t.category ? t.category.toString().trim() : '';
    acc[cat] = (acc[cat] || 0) + t.amount;
    return acc;
  }, {});
};

userSchema.methods.getSavingsRate = function() {
  const monthlyIncome = this.monthlyIncome || 0;
  const monthlyExpenses = Object.values(this.getMonthlySpending()).reduce((sum, amount) => sum + amount, 0);
  
  return monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;
};

userSchema.methods.getFinancialHealthScore = function() {
  const savingsRate = this.getSavingsRate();
  const emergencyFundMonths = this.getEmergencyFundMonths();
  const debtToIncome = this.getDebtToIncomeRatio();
  const goalProgress = this.getAverageGoalProgress();
  
  let score = 0;
  
  // Savings rate (max 30 points)
  if (savingsRate >= 20) score += 30;
  else if (savingsRate >= 15) score += 25;
  else if (savingsRate >= 10) score += 20;
  else if (savingsRate >= 5) score += 15;
  else if (savingsRate > 0) score += 10;
  
  // Emergency fund (max 30 points)
  if (emergencyFundMonths >= 6) score += 30;
  else if (emergencyFundMonths >= 3) score += 20;
  else if (emergencyFundMonths >= 1) score += 10;
  
  // Debt-to-income (max 20 points)
  if (debtToIncome <= 0.2) score += 20;
  else if (debtToIncome <= 0.3) score += 15;
  else if (debtToIncome <= 0.4) score += 10;
  else if (debtToIncome <= 0.5) score += 5;
  
  // Goal progress (max 20 points)
  if (goalProgress >= 80) score += 20;
  else if (goalProgress >= 60) score += 15;
  else if (goalProgress >= 40) score += 10;
  else if (goalProgress >= 20) score += 5;
  
  return Math.min(score, 100);
};

userSchema.methods.getEmergencyFundMonths = function() {
  const monthlyExpenses = Object.values(this.getMonthlySpending()).reduce((sum, amount) => sum + amount, 0);
  const totalSavings = this.getTotalBalance();
  
  return monthlyExpenses > 0 ? totalSavings / monthlyExpenses : 0;
};

userSchema.methods.getDebtToIncomeRatio = function() {
  const monthlyDebtPayments = this.transactions
    .filter(t => t.type === 'expense' && t.category.toLowerCase().includes('loan'))
    .reduce((sum, t) => sum + t.amount, 0);
  
  const monthlyIncome = this.monthlyIncome || 0;
  
  return monthlyIncome > 0 ? monthlyDebtPayments / monthlyIncome : 0;
};

userSchema.methods.getAverageGoalProgress = function() {
  if (this.financialGoals.length === 0) return 0;
  
  const totalProgress = this.financialGoals.reduce((sum, goal) => {
    return sum + (goal.currentAmount / goal.targetAmount) * 100;
  }, 0);
  
  return totalProgress / this.financialGoals.length;
};

// Remove sensitive fields from JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.securityAnswer;
  delete user.verificationToken;
  delete user.loginAttempts;
  delete user.lockUntil;
  return user;
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);