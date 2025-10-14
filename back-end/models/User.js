const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6
  },
  phone: {
    type: String,
    trim: true
  },
  securityQuestion: {
    type: String
  },
  securityAnswer: {
    type: String
  },
  monthlyIncome: {
    type: Number,
    default: 0
  },
  financialGoals: {
    type: [String],
    default: []
  },
  notificationPreferences: {
    billReminders: { type: Boolean, default: true },
    budgetAlerts: { type: Boolean, default: true },
    investmentUpdates: { type: Boolean, default: true },
    marketingNewsletters: { type: Boolean, default: false }
  },
  dashboardView: {
    type: String,
    enum: ['simple', 'detailed', 'advanced'],
    default: 'simple'
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it's modified or new
  if (!this.isModified('password')) return next();
  
  // Hash password with cost factor of 12
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

const User = mongoose.model('User', userSchema);

module.exports = User;