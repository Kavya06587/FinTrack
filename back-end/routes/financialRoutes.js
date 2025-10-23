const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');

const router = express.Router();

// Get financial overview
router.get('/overview', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const totalBalance = user.getTotalBalance();
    const monthlySpending = user.getMonthlySpending();
    const totalMonthlySpending = Object.values(monthlySpending).reduce((sum, amount) => sum + amount, 0);
    const savingsRate = user.getSavingsRate();
    const financialHealthScore = user.getFinancialHealthScore();
    
    // Calculate monthly trends
    const currentMonth = new Date().getMonth();
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const currentYear = new Date().getFullYear();
    const previousMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    const currentMonthSpending = user.getMonthlySpending(currentMonth, currentYear);
    const previousMonthSpending = user.getMonthlySpending(previousMonth, previousMonthYear);
    
    const spendingChange = Object.values(previousMonthSpending).reduce((sum, amount) => sum + amount, 0);
    const currentSpending = Object.values(currentMonthSpending).reduce((sum, amount) => sum + amount, 0);
    
    const spendingTrend = spendingChange > 0 ? 
      ((currentSpending - spendingChange) / spendingChange) * 100 : 0;

    const financialData = {
      totalBalance,
      monthlyIncome: user.monthlyIncome || 0,
      monthlyExpenses: totalMonthlySpending,
      monthlySavings: (user.monthlyIncome || 0) - totalMonthlySpending,
      savingsRate,
      financialHealthScore,
      activeGoals: user.financialGoals.filter(goal => !goal.completed).length,
      monthlySpendingByCategory: monthlySpending,
      spendingTrend,
      recentTransactions: user.transactions
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5),
      budgetStatus: user.budgets.map(budget => {
        const spent = monthlySpending[budget.category] || 0;
        const percentage = (spent / budget.limit) * 100;
        const status = percentage >= 100 ? 'exceeded' : 
                      percentage >= budget.alertThreshold ? 'warning' : 'good';
        
        return {
          category: budget.category,
          limit: budget.limit,
          spent,
          remaining: budget.limit - spent,
          percentage: Math.min(percentage, 100),
          status,
          alerts: budget.alerts
        };
      }),
      goalsProgress: user.financialGoals.map(goal => ({
        id: goal._id,
        title: goal.title,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        progress: (goal.currentAmount / goal.targetAmount) * 100,
        deadline: goal.deadline,
        category: goal.category,
        priority: goal.priority,
        completed: goal.completed
      }))
    };

    res.json({
      success: true,
      ...financialData
    });
  } catch (error) {
    console.error('Financial overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching financial overview'
    });
  }
});

// Get financial analytics
router.get('/analytics', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const { period = '6m' } = req.query; // 1m, 3m, 6m, 1y

    const months = parseInt(period) || 6;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // Filter transactions for the period
    const periodTransactions = user.transactions.filter(
      t => t.date >= startDate && t.date <= endDate
    );

    // Monthly trends
    const monthlyTrends = [];
    for (let i = 0; i < months; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.getMonth();
      const year = date.getFullYear();
      const monthName = date.toLocaleString('default', { month: 'short', year: 'numeric' });

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

    // Category insights
    const categorySpending = periodTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {});

    const totalSpending = Object.values(categorySpending).reduce((sum, amount) => sum + amount, 0);
    const categoryInsights = Object.entries(categorySpending)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalSpending > 0 ? (amount / totalSpending) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    // Spending patterns
    const weeklySpending = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
    periodTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const day = t.date.getDay();
        weeklySpending[day] += t.amount;
      });

    res.json({
      success: true,
      analytics: {
        period: `${months} months`,
        monthlyTrends,
        categoryInsights,
        weeklySpending,
        totalTransactions: periodTransactions.length,
        averageMonthlySpending: monthlyTrends.reduce((sum, month) => sum + month.expenses, 0) / months,
        largestExpense: Math.max(...periodTransactions.filter(t => t.type === 'expense').map(t => t.amount)),
        mostFrequentCategory: categoryInsights[0]?.category || 'No data'
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics'
    });
  }
});

// Get budget recommendations
router.get('/budget-recommendations', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const monthlySpending = user.getMonthlySpending();
    const totalSpending = Object.values(monthlySpending).reduce((sum, amount) => sum + amount, 0);
    const monthlyIncome = user.monthlyIncome || 0;

    // Standard budget recommendations (percentage of income)
    const standardBudgets = {
      'Housing': 0.25,
      'Food & Dining': 0.15,
      'Transportation': 0.10,
      'Healthcare': 0.05,
      'Entertainment': 0.05,
      'Personal Care': 0.05,
      'Savings': 0.20,
      'Debt Repayment': 0.10,
      'Other': 0.05
    };

    const recommendations = Object.entries(standardBudgets).map(([category, percentage]) => {
      const recommendedAmount = monthlyIncome * percentage;
      const currentSpending = monthlySpending[category] || 0;
      const difference = currentSpending - recommendedAmount;
      const status = difference > 0 ? 'over' : difference < -recommendedAmount * 0.2 ? 'under' : 'optimal';

      return {
        category,
        recommendedAmount: Math.round(recommendedAmount),
        currentSpending: Math.round(currentSpending),
        difference: Math.round(difference),
        status,
        message: getBudgetMessage(category, status, Math.abs(difference))
      };
    });

    res.json({
      success: true,
      recommendations,
      monthlyIncome,
      totalSpending
    });
  } catch (error) {
    console.error('Budget recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating budget recommendations'
    });
  }
});

// Helper function for budget messages
function getBudgetMessage(category, status, difference) {
  if (status === 'optimal') {
    return `Your ${category.toLowerCase()} spending is within recommended limits.`;
  } else if (status === 'over') {
    return `You're spending $${difference} more than recommended on ${category.toLowerCase()}.`;
  } else {
    return `You're spending $${difference} less than recommended on ${category.toLowerCase()}.`;
  }
}

module.exports = router;