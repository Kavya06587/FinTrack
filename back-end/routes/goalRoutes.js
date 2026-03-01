// goalRoutes.js - Complete backend routes for goals
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/goals - Get all goals for user
router.get('/', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            goals: user.financialGoals || []
        });

    } catch (error) {
        console.error('Get goals error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching goals'
        });
    }
});

// POST /api/goals - Create a new goal
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { 
            title, 
            targetAmount, 
            deadline, 
            category, 
            priority, 
            description, 
            monthlyContribution,
            currentAmount 
        } = req.body;

        // Validation
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
            currentAmount: parseFloat(currentAmount) || 0,
            deadline: new Date(deadline),
            category: category || 'savings',
            priority: priority || 'medium',
            completed: false,
            description: description || '',
            monthlyContribution: monthlyContribution ? parseFloat(monthlyContribution) : undefined,
            alerts: true,
            createdAt: new Date()
        };

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        user.financialGoals.push(goal);
        await user.save();

        const newGoal = user.financialGoals[user.financialGoals.length - 1];

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

// POST /api/goals/:goalId/contribute - Add contribution to goal
router.post('/:goalId/contribute', authMiddleware, async (req, res) => {
    try {
        const { goalId } = req.params;
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Valid contribution amount is required'
            });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const goal = user.financialGoals.id(goalId);
        if (!goal) {
            return res.status(404).json({
                success: false,
                message: 'Goal not found'
            });
        }

        if (goal.completed) {
            return res.status(400).json({
                success: false,
                message: 'Cannot contribute to completed goal'
            });
        }

        // Add contribution
        goal.currentAmount += parseFloat(amount);
        
        // Auto-complete if target is reached
        if (goal.currentAmount >= goal.targetAmount) {
            goal.completed = true;
            goal.currentAmount = goal.targetAmount; // Prevent over-contribution
        }

        await user.save();

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

// PUT /api/goals/:goalId - Update a goal
router.put('/:goalId', authMiddleware, async (req, res) => {
    try {
        const { goalId } = req.params;
        const { 
            title, 
            targetAmount, 
            deadline, 
            category, 
            priority, 
            description,
            monthlyContribution,
            currentAmount 
        } = req.body;

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const goal = user.financialGoals.id(goalId);
        if (!goal) {
            return res.status(404).json({
                success: false,
                message: 'Goal not found'
            });
        }

        // Update fields if provided
        if (title !== undefined) goal.title = title.trim();
        if (targetAmount !== undefined) {
            if (targetAmount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Target amount must be greater than 0'
                });
            }
            goal.targetAmount = parseFloat(targetAmount);
        }
        if (deadline !== undefined) {
            if (new Date(deadline) <= new Date()) {
                return res.status(400).json({
                    success: false,
                    message: 'Deadline must be in the future'
                });
            }
            goal.deadline = new Date(deadline);
        }
        if (category !== undefined) goal.category = category;
        if (priority !== undefined) goal.priority = priority;
        if (description !== undefined) goal.description = description;
        if (monthlyContribution !== undefined) goal.monthlyContribution = parseFloat(monthlyContribution);
        if (currentAmount !== undefined) goal.currentAmount = parseFloat(currentAmount);

        // Re-check completion status
        if (goal.currentAmount >= goal.targetAmount) {
            goal.completed = true;
            goal.currentAmount = goal.targetAmount;
        } else {
            goal.completed = false;
        }

        await user.save();

        res.json({
            success: true,
            message: 'Goal updated successfully',
            goal
        });

    } catch (error) {
        console.error('Update goal error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating goal'
        });
    }
});

// DELETE /api/goals/:goalId - Delete a goal
router.delete('/:goalId', authMiddleware, async (req, res) => {
    try {
        const { goalId } = req.params;

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const goalIndex = user.financialGoals.findIndex(goal => goal._id.toString() === goalId);
        if (goalIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Goal not found'
            });
        }

        user.financialGoals.splice(goalIndex, 1);
        await user.save();

        res.json({
            success: true,
            message: 'Goal deleted successfully'
        });

    } catch (error) {
        console.error('Delete goal error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting goal'
        });
    }
});

// POST /api/goals/retirement-calculate - Retirement calculation
router.post('/retirement-calculate', authMiddleware, async (req, res) => {
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

// GET /api/goals/stats - Get goals statistics
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const goals = user.financialGoals || [];
        const activeGoals = goals.filter(goal => !goal.completed).length;
        const completedGoals = goals.filter(goal => goal.completed).length;
        const totalSaved = goals.reduce((sum, goal) => sum + (goal.currentAmount || 0), 0);
        
        // Calculate upcoming deadlines (within 30 days)
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        const upcomingDeadlines = goals.filter(goal => {
            if (goal.completed) return false;
            const deadline = new Date(goal.deadline);
            return deadline <= thirtyDaysFromNow && deadline >= new Date();
        }).length;

        res.json({
            success: true,
            stats: {
                activeGoals,
                completedGoals,
                totalSaved,
                upcomingDeadlines,
                totalGoals: goals.length
            }
        });

    } catch (error) {
        console.error('Get goals stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching goals statistics'
        });
    }
});

module.exports = router;