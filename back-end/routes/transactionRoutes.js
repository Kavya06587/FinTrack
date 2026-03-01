const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { transactionSchema, validateRequest } = require('../middleware/validation');
const User = require('../models/User');

const router = express.Router();

// Get all transactions with filtering and pagination
router.get('/', protect, async (req, res) => {
  try {
    const { 
      type, 
      category, 
      startDate, 
      endDate, 
      page = 1, 
      limit = 10,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;

    const user = await User.findById(req.user._id);
    let transactions = [...user.transactions];

    // Apply filters
    if (type) {
      transactions = transactions.filter(t => t.type === type);
    }
    
    if (category) {
      transactions = transactions.filter(t => 
        t.category.toLowerCase().includes(category.toLowerCase())
      );
    }
    
    if (startDate) {
      transactions = transactions.filter(t => t.date >= new Date(startDate));
    }
    
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      transactions = transactions.filter(t => t.date <= end);
    }

    // Sort transactions
    const sortField = sortBy === 'amount' ? 'amount' : 'date';
    transactions.sort((a, b) => {
      if (sortOrder === 'asc') {
        return a[sortField] - b[sortField];
      } else {
        return b[sortField] - a[sortField];
      }
    });

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
      },
      filters: {
        type: type || 'all',
        category: category || 'all',
        dateRange: {
          start: startDate,
          end: endDate
        }
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

// Add new transaction
router.post('/', protect, validateRequest(transactionSchema), async (req, res) => {
  try {
    const { type, category, amount, description, date, recurring, recurringFrequency, tags } = req.body;

    const user = await User.findById(req.user._id);
    
    const transaction = {
      type,
      category: category.trim(),
      amount: parseFloat(amount),
      description: description.trim(),
      date: date ? new Date(date) : new Date(),
      recurring: recurring || false,
      recurringFrequency: recurringFrequency || 'monthly',
      tags: tags || []
    };

    // Validate date is not in future
    if (transaction.date > new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Transaction date cannot be in the future'
      });
    }

    user.transactions.push(transaction);
    await user.save();

    // Get the newly added transaction
    const newTransaction = user.transactions[user.transactions.length - 1];

    // Check for budget alerts if it's an expense
    if (type === 'expense') {
      await checkBudgetAlerts(user, category, amount);
    }

    res.status(201).json({
      success: true,
      message: 'Transaction added successfully',
      transaction: newTransaction
    });

  } catch (error) {
    console.error('Add transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding transaction'
    });
  }
});

// Update transaction
router.put('/:transactionId', protect, validateRequest(transactionSchema), async (req, res) => {
  try {
    const { transactionId } = req.params;
    const updateData = req.body;

    const user = await User.findById(req.user._id);
    const transaction = user.transactions.id(transactionId);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Update transaction fields
    Object.keys(updateData).forEach(key => {
      if (key !== '_id' && transaction[key] !== undefined) {
        transaction[key] = updateData[key];
      }
    });

    await user.save();

    res.json({
      success: true,
      message: 'Transaction updated successfully',
      transaction
    });

  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating transaction'
    });
  }
});

// Delete transaction
router.delete('/:transactionId', protect, async (req, res) => {
  try {
    const { transactionId } = req.params;

    const user = await User.findById(req.user._id);
    const transaction = user.transactions.id(transactionId);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    user.transactions.pull(transactionId);
    await user.save();

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

// Get transaction statistics
router.get('/statistics', protect, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const user = await User.findById(req.user._id);

    const now = new Date();
    let startDate;

    switch (period) {
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const periodTransactions = user.transactions.filter(t => t.date >= startDate);

    const statistics = {
      totalIncome: periodTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0),
      totalExpenses: periodTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0),
      transactionCount: periodTransactions.length,
      averageTransaction: periodTransactions.length > 0 ? 
        periodTransactions.reduce((sum, t) => sum + t.amount, 0) / periodTransactions.length : 0,
      largestTransaction: periodTransactions.length > 0 ? 
        Math.max(...periodTransactions.map(t => t.amount)) : 0,
      categoryBreakdown: periodTransactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => {
          acc[t.category] = (acc[t.category] || 0) + t.amount;
          return acc;
        }, {})
    };

    res.json({
      success: true,
      period,
      statistics
    });

  } catch (error) {
    console.error('Transaction statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching transaction statistics'
    });
  }
});

// Helper function to check budget alerts
async function checkBudgetAlerts(user, category, amount) {
  const budget = user.budgets.find(b => b.category === category);
  
  if (budget && budget.alerts) {
    const monthlySpending = user.getMonthlySpending();
    const spent = monthlySpending[category] || 0;
    const percentage = (spent / budget.limit) * 100;

    if (percentage >= budget.alertThreshold) {
      // In a real application, you would send an email or push notification here
      console.log(`Budget alert: ${category} is at ${percentage.toFixed(1)}% of limit`);
      
      // You could also emit a real-time alert via WebSocket
      // io.to(user._id.toString()).emit('budgetAlert', {
      //   category,
      //   spent,
      //   limit: budget.limit,
      //   percentage
      // });
    }
  }
}

module.exports = router;