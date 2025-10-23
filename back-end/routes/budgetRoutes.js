const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { budgetSchema, validateRequest } = require('../middleware/validation');
const User = require('../models/User');

const router = express.Router();

// GET /api/budgets - Get all budgets
router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Calculate current spending for each budget
    const monthlySpending = user.getMonthlySpending();
    const budgetsWithSpending = user.budgets.map(budget => {
      const spent = monthlySpending[budget.category] || 0;
      const percentage = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
      const status = percentage >= 100 ? 'exceeded' : 
                    percentage >= 80 ? 'warning' : 'good';
      
      return {
        ...budget.toObject(),
        spent,
        percentage: Math.min(percentage, 100),
        status,
        remaining: budget.limit - spent
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

// POST /api/budgets - Create new budget
router.post('/', protect, validateRequest(budgetSchema), async (req, res) => {
  try {
    const { category, limit, period, description, alerts, alertThreshold } = req.body;

    const user = await User.findById(req.user._id);

    // Check if budget already exists for this category
    const existingBudget = user.budgets.find(b => b.category === category);
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
      alertThreshold: alertThreshold || 80,
      spent: 0
    };

    user.budgets.push(budget);
    await user.save();

    const newBudget = user.budgets[user.budgets.length - 1];

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

// PUT /api/budgets/:id - Update budget
router.put('/:budgetId', protect, validateRequest(budgetSchema), async (req, res) => {
  try {
    const { budgetId } = req.params;
    const { limit, period, description, alerts, alertThreshold } = req.body;

    const user = await User.findById(req.user._id);
    const budget = user.budgets.id(budgetId);
    
    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    // Update budget fields
    if (limit !== undefined) budget.limit = parseFloat(limit);
    if (period) budget.period = period;
    if (description !== undefined) budget.description = description;
    if (alerts !== undefined) budget.alerts = alerts;
    if (alertThreshold !== undefined) budget.alertThreshold = alertThreshold;

    await user.save();

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

// DELETE /api/budgets/:id - Delete budget
router.delete('/:budgetId', protect, async (req, res) => {
  try {
    const { budgetId } = req.params;

    const user = await User.findById(req.user._id);
    const budget = user.budgets.id(budgetId);
    
    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    user.budgets.pull(budgetId);
    await user.save();

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

// GET /api/budgets/categories - Get budget categories
router.get('/categories', protect, async (req, res) => {
  try {
    const categories = [
      'Housing & Rent',
      'Food & Dining',
      'Transportation',
      'Entertainment',
      'Bills & Utilities',
      'Healthcare',
      'Education',
      'Shopping',
      'Travel',
      'Personal Care',
      'Gifts & Donations',
      'Savings & Investments',
      'Debt Repayment',
      'Insurance',
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

// GET /api/budgets/analytics - Get budget analytics
router.get('/analytics', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const monthlySpending = user.getMonthlySpending();

    const analytics = user.budgets.map(budget => {
      const spent = monthlySpending[budget.category] || 0;
      const percentage = (spent / budget.limit) * 100;
      
      return {
        category: budget.category,
        limit: budget.limit,
        spent,
        percentage: Math.min(percentage, 100),
        remaining: budget.limit - spent,
        status: percentage >= 100 ? 'exceeded' : percentage >= 80 ? 'warning' : 'good',
        trend: this.calculateBudgetTrend(user, budget.category)
      };
    });

    const totalBudget = user.budgets.reduce((sum, budget) => sum + budget.limit, 0);
    const totalSpent = Object.values(monthlySpending).reduce((sum, amount) => sum + amount, 0);
    const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    res.json({
      success: true,
      analytics,
      summary: {
        totalBudget,
        totalSpent,
        overallPercentage,
        remainingBudget: totalBudget - totalSpent,
        activeBudgets: user.budgets.length,
        exceededBudgets: analytics.filter(a => a.status === 'exceeded').length
      }
    });

  } catch (error) {
    console.error('Budget analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching budget analytics'
    });
  }
});

// Helper function to calculate budget trend
function calculateBudgetTrend(user, category) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const currentSpending = user.getMonthlySpending(currentMonth, currentYear)[category] || 0;
  const previousSpending = user.getMonthlySpending(lastMonth, lastMonthYear)[category] || 0;

  if (previousSpending === 0) return 0;
  
  return ((currentSpending - previousSpending) / previousSpending) * 100;
}

module.exports = router;