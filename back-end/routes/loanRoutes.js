// routes/loanRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');

// Loan Schema (embedded in User model)
const loanSchema = {
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  type: {
    type: String,
    required: true,
    enum: ['personal', 'auto', 'mortgage', 'student', 'business', 'other']
  },
  amount: {
    type: Number,
    required: true,
    min: [1000, 'Loan amount must be at least ₹1,000'],
    max: [100000000, 'Loan amount too large']
  },
  interestRate: {
    type: Number,
    required: true,
    min: [0.1, 'Interest rate must be at least 0.1%'],
    max: [30, 'Interest rate too high']
  },
  term: {
    type: Number, // in years
    required: true,
    min: [1, 'Loan term must be at least 1 year'],
    max: [40, 'Loan term too long']
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  lender: {
    type: String,
    required: true,
    trim: true
  },
  remainingBalance: {
    type: Number,
    required: true,
    min: 0
  },
  monthlyPayment: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['active', 'paid', 'defaulted', 'settled'],
    default: 'active'
  },
  extraPayment: {
    type: Number,
    default: 0,
    min: 0
  },
  description: {
    type: String,
    maxlength: 500
  }
};

const paymentSchema = {
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  amount: {
    type: Number,
    required: true,
    min: [1, 'Payment amount must be at least ₹1']
  },
  principal: {
    type: Number,
    required: true,
    min: 0
  },
  interest: {
    type: Number,
    required: true,
    min: 0
  },
  remainingBalance: {
    type: Number,
    required: true,
    min: 0
  },
  type: {
    type: String,
    enum: ['regular', 'extra', 'lump-sum'],
    default: 'regular'
  },
  note: {
    type: String,
    maxlength: 200
  }
};

// ==================== LOAN CALCULATION ROUTES ====================

// Calculate loan details
router.post('/calculate', protect, async (req, res) => {
  try {
    const { amount, interestRate, term, startDate, extraPayment = 0 } = req.body;

    // Validation
    if (!amount || !interestRate || !term) {
      return res.status(400).json({
        success: false,
        message: 'Loan amount, interest rate, and term are required'
      });
    }

    if (amount <= 0 || interestRate <= 0 || term <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Loan amount, interest rate, and term must be positive numbers'
      });
    }

    const loanAmount = parseFloat(amount);
    const annualInterestRate = parseFloat(interestRate);
    const loanTermYears = parseFloat(term);
    const monthlyExtraPayment = parseFloat(extraPayment) || 0;

    // Calculate monthly payment
    const monthlyInterestRate = annualInterestRate / 100 / 12;
    const numberOfPayments = loanTermYears * 12;
    
    let monthlyPayment = 0;
    if (monthlyInterestRate > 0) {
      monthlyPayment = (monthlyInterestRate * loanAmount) / 
                      (1 - Math.pow(1 + monthlyInterestRate, -numberOfPayments));
    } else {
      monthlyPayment = loanAmount / numberOfPayments;
    }

    const totalPayment = monthlyPayment * numberOfPayments;
    const totalInterest = totalPayment - loanAmount;

    // Generate amortization schedule
    let balance = loanAmount;
    const amortizationSchedule = [];
    let currentDate = startDate ? new Date(startDate) : new Date();

    for (let i = 1; i <= numberOfPayments; i++) {
      const interestPayment = balance * monthlyInterestRate;
      let principalPayment = monthlyPayment - interestPayment;
      const totalPaymentThisMonth = monthlyPayment + monthlyExtraPayment;
      let extraPrincipalPayment = monthlyExtraPayment;

      // Apply extra payment to principal
      if (extraPrincipalPayment > 0) {
        principalPayment += extraPrincipalPayment;
      }

      // Ensure we don't overpay
      if (principalPayment > balance) {
        principalPayment = balance;
        extraPrincipalPayment = Math.max(0, principalPayment - (monthlyPayment - interestPayment));
      }

      balance -= principalPayment;

      // Format payment date
      const paymentDate = new Date(currentDate);
      paymentDate.setMonth(paymentDate.getMonth() + i);

      amortizationSchedule.push({
        paymentNumber: i,
        paymentDate: paymentDate.toISOString().split('T')[0],
        payment: totalPaymentThisMonth,
        principal: principalPayment,
        interest: interestPayment,
        extraPayment: extraPrincipalPayment,
        remainingBalance: Math.max(0, balance)
      });

      // Stop if loan is paid off
      if (balance <= 0) break;
    }

    // Calculate actual payoff time with extra payments
    const actualPayoffMonths = amortizationSchedule.length;
    const actualPayoffYears = actualPayoffMonths / 12;

    // Calculate interest savings from extra payments
    const standardTotalInterest = (monthlyPayment * numberOfPayments) - loanAmount;
    const actualTotalInterest = amortizationSchedule.reduce((sum, payment) => sum + payment.interest, 0);
    const interestSavings = standardTotalInterest - actualTotalInterest;

    res.json({
      success: true,
      calculation: {
        loanAmount,
        interestRate: annualInterestRate,
        term: loanTermYears,
        monthlyPayment,
        totalPayment: monthlyPayment * numberOfPayments,
        totalInterest,
        amortizationSchedule,
        withExtraPayments: {
          monthlyPayment: monthlyPayment + monthlyExtraPayment,
          actualPayoffMonths,
          actualPayoffYears: parseFloat(actualPayoffYears.toFixed(2)),
          totalInterest: actualTotalInterest,
          interestSavings,
          monthsSaved: numberOfPayments - actualPayoffMonths
        }
      }
    });

  } catch (error) {
    console.error('Loan calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating loan details'
    });
  }
});

// Compare multiple loan options
router.post('/compare', protect, async (req, res) => {
  try {
    const { loans } = req.body;

    if (!loans || !Array.isArray(loans) || loans.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Loans array is required'
      });
    }

    if (loans.length > 5) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 5 loans can be compared at once'
      });
    }

    const comparisons = [];

    for (const loan of loans) {
      const { amount, interestRate, term, extraPayment = 0 } = loan;

      if (!amount || !interestRate || !term) {
        continue; // Skip invalid loans
      }

      const monthlyInterestRate = interestRate / 100 / 12;
      const numberOfPayments = term * 12;
      
      let monthlyPayment = 0;
      if (monthlyInterestRate > 0) {
        monthlyPayment = (monthlyInterestRate * amount) / 
                        (1 - Math.pow(1 + monthlyInterestRate, -numberOfPayments));
      } else {
        monthlyPayment = amount / numberOfPayments;
      }

      const totalPayment = monthlyPayment * numberOfPayments;
      const totalInterest = totalPayment - amount;

      comparisons.push({
        ...loan,
        monthlyPayment,
        totalPayment,
        totalInterest,
        affordability: monthlyPayment / (req.user.monthlyIncome || 1) * 100 // Debt-to-income ratio
      });
    }

    // Sort by total interest (lowest first)
    comparisons.sort((a, b) => a.totalInterest - b.totalInterest);

    res.json({
      success: true,
      comparisons,
      recommendation: comparisons[0] // Best option (lowest total interest)
    });

  } catch (error) {
    console.error('Loan comparison error:', error);
    res.status(500).json({
      success: false,
      message: 'Error comparing loans'
    });
  }
});

// ==================== LOAN MANAGEMENT ROUTES ====================

// Get all user loans
router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.loans) {
      user.loans = [];
      await user.save();
    }

    // Calculate additional metrics for each loan
    const loansWithMetrics = user.loans.map(loan => {
      const totalPaid = loan.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
      const principalPaid = loan.payments?.reduce((sum, payment) => sum + payment.principal, 0) || 0;
      const interestPaid = loan.payments?.reduce((sum, payment) => sum + payment.interest, 0) || 0;
      const progress = (principalPaid / loan.amount) * 100;
      
      // Calculate time remaining
      const paymentsMade = loan.payments?.length || 0;
      const originalTermMonths = loan.term * 12;
      const monthsRemaining = Math.max(0, originalTermMonths - paymentsMade);
      
      // Calculate estimated payoff date
      const estimatedPayoffDate = new Date();
      estimatedPayoffDate.setMonth(estimatedPayoffDate.getMonth() + monthsRemaining);

      return {
        ...loan.toObject(),
        metrics: {
          totalPaid,
          principalPaid,
          interestPaid,
          progress: parseFloat(progress.toFixed(1)),
          monthsRemaining,
          estimatedPayoffDate: estimatedPayoffDate.toISOString().split('T')[0],
          nextPaymentDate: calculateNextPaymentDate(loan),
          status: calculateLoanStatus(loan, principalPaid)
        }
      };
    });

    res.json({
      success: true,
      loans: loansWithMetrics,
      summary: {
        totalLoans: loansWithMetrics.length,
        activeLoans: loansWithMetrics.filter(loan => loan.status === 'active').length,
        totalBorrowed: loansWithMetrics.reduce((sum, loan) => sum + loan.amount, 0),
        totalRemaining: loansWithMetrics.reduce((sum, loan) => sum + loan.remainingBalance, 0),
        totalMonthlyPayment: loansWithMetrics.reduce((sum, loan) => sum + loan.monthlyPayment, 0)
      }
    });

  } catch (error) {
    console.error('Get loans error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching loans'
    });
  }
});

// Add a new loan
router.post('/', protect, async (req, res) => {
  try {
    const {
      name,
      type,
      amount,
      interestRate,
      term,
      startDate,
      lender,
      extraPayment,
      description
    } = req.body;

    // Validation
    if (!name || !type || !amount || !interestRate || !term || !lender) {
      return res.status(400).json({
        success: false,
        message: 'Name, type, amount, interest rate, term, and lender are required'
      });
    }

    if (amount <= 0 || interestRate <= 0 || term <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount, interest rate, and term must be positive numbers'
      });
    }

    const user = await User.findById(req.user._id);
    
    // Initialize loans array if it doesn't exist
    if (!user.loans) {
      user.loans = [];
    }

    // Calculate monthly payment
    const monthlyInterestRate = interestRate / 100 / 12;
    const numberOfPayments = term * 12;
    const monthlyPayment = (monthlyInterestRate * amount) / 
                          (1 - Math.pow(1 + monthlyInterestRate, -numberOfPayments));

    const newLoan = {
      name: name.trim(),
      type,
      amount: parseFloat(amount),
      interestRate: parseFloat(interestRate),
      term: parseFloat(term),
      startDate: startDate ? new Date(startDate) : new Date(),
      lender: lender.trim(),
      remainingBalance: parseFloat(amount),
      monthlyPayment: parseFloat(monthlyPayment.toFixed(2)),
      status: 'active',
      extraPayment: parseFloat(extraPayment) || 0,
      description: description || '',
      payments: [],
      createdAt: new Date()
    };

    user.loans.push(newLoan);
    await user.save();

    const savedLoan = user.loans[user.loans.length - 1];

    res.status(201).json({
      success: true,
      message: 'Loan added successfully',
      loan: savedLoan
    });

  } catch (error) {
    console.error('Add loan error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding loan'
    });
  }
});

// Update a loan
router.put('/:loanId', protect, async (req, res) => {
  try {
    const { loanId } = req.params;
    const updates = req.body;

    const user = await User.findById(req.user._id);
    const loan = user.loans.id(loanId);

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }

    // Update allowed fields
    const allowedUpdates = ['name', 'type', 'lender', 'extraPayment', 'description', 'status'];
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        loan[field] = updates[field];
      }
    });

    // Recalculate monthly payment if amount, interest rate, or term changes
    if (updates.amount || updates.interestRate || updates.term) {
      const amount = updates.amount || loan.amount;
      const interestRate = updates.interestRate || loan.interestRate;
      const term = updates.term || loan.term;

      const monthlyInterestRate = interestRate / 100 / 12;
      const numberOfPayments = term * 12;
      const monthlyPayment = (monthlyInterestRate * amount) / 
                            (1 - Math.pow(1 + monthlyInterestRate, -numberOfPayments));

      loan.amount = parseFloat(amount);
      loan.interestRate = parseFloat(interestRate);
      loan.term = parseFloat(term);
      loan.monthlyPayment = parseFloat(monthlyPayment.toFixed(2));
      
      // Update remaining balance if amount changed
      if (updates.amount) {
        const principalPaid = loan.amount - loan.remainingBalance;
        loan.remainingBalance = Math.max(0, loan.amount - principalPaid);
      }
    }

    await user.save();

    res.json({
      success: true,
      message: 'Loan updated successfully',
      loan
    });

  } catch (error) {
    console.error('Update loan error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating loan'
    });
  }
});

// Delete a loan
router.delete('/:loanId', protect, async (req, res) => {
  try {
    const { loanId } = req.params;

    const user = await User.findById(req.user._id);
    const loanIndex = user.loans.findIndex(loan => loan._id.toString() === loanId);

    if (loanIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }

    user.loans.splice(loanIndex, 1);
    await user.save();

    res.json({
      success: true,
      message: 'Loan deleted successfully'
    });

  } catch (error) {
    console.error('Delete loan error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting loan'
    });
  }
});

// ==================== PAYMENT MANAGEMENT ROUTES ====================

// Add payment to a loan
router.post('/:loanId/payments', protect, async (req, res) => {
  try {
    const { loanId } = req.params;
    const { date, amount, type = 'regular', note = '' } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid payment amount is required'
      });
    }

    const user = await User.findById(req.user._id);
    const loan = user.loans.id(loanId);

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }

    if (loan.remainingBalance <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Loan is already paid off'
      });
    }

    // Calculate interest and principal portions
    const monthlyInterestRate = loan.interestRate / 100 / 12;
    const interestPayment = loan.remainingBalance * monthlyInterestRate;
    let principalPayment = Math.min(amount - interestPayment, loan.remainingBalance);

    // For extra payments, apply entire amount to principal after interest
    if (type === 'extra' || type === 'lump-sum') {
      principalPayment = Math.min(amount, loan.remainingBalance);
    }

    const totalPayment = type === 'regular' ? 
      Math.min(amount, loan.monthlyPayment + (loan.extraPayment || 0)) : amount;

    // Update loan balance
    loan.remainingBalance -= principalPayment;

    // Update loan status if paid off
    if (loan.remainingBalance <= 0) {
      loan.remainingBalance = 0;
      loan.status = 'paid';
    }

    // Add payment record
    const payment = {
      date: date ? new Date(date) : new Date(),
      amount: totalPayment,
      principal: principalPayment,
      interest: type === 'regular' ? interestPayment : 0,
      remainingBalance: loan.remainingBalance,
      type,
      note: note.trim()
    };

    if (!loan.payments) {
      loan.payments = [];
    }

    loan.payments.push(payment);
    await user.save();

    const newPayment = loan.payments[loan.payments.length - 1];

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      payment: newPayment,
      loan: {
        remainingBalance: loan.remainingBalance,
        status: loan.status
      }
    });

  } catch (error) {
    console.error('Add payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error recording payment'
    });
  }
});

// Get payment history for a loan
router.get('/:loanId/payments', protect, async (req, res) => {
  try {
    const { loanId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const user = await User.findById(req.user._id);
    const loan = user.loans.id(loanId);

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }

    const payments = loan.payments || [];
    
    // Sort by date (newest first)
    payments.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedPayments = payments.slice(startIndex, endIndex);

    // Calculate payment statistics
    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const principalPaid = payments.reduce((sum, payment) => sum + payment.principal, 0);
    const interestPaid = payments.reduce((sum, payment) => sum + payment.interest, 0);

    res.json({
      success: true,
      payments: paginatedPayments,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(payments.length / limit),
        totalPayments: payments.length,
        hasNext: endIndex < payments.length,
        hasPrev: page > 1
      },
      summary: {
        totalPaid,
        principalPaid,
        interestPaid,
        remainingBalance: loan.remainingBalance,
        progress: (principalPaid / loan.amount) * 100
      }
    });

  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment history'
    });
  }
});

// Delete a payment
router.delete('/:loanId/payments/:paymentId', protect, async (req, res) => {
  try {
    const { loanId, paymentId } = req.params;

    const user = await User.findById(req.user._id);
    const loan = user.loans.id(loanId);

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }

    const paymentIndex = loan.payments.findIndex(p => p._id.toString() === paymentId);
    
    if (paymentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    const payment = loan.payments[paymentIndex];

    // Restore the principal amount to remaining balance
    loan.remainingBalance += payment.principal;

    // Update loan status back to active if it was paid
    if (loan.status === 'paid' && loan.remainingBalance > 0) {
      loan.status = 'active';
    }

    // Remove the payment
    loan.payments.splice(paymentIndex, 1);
    await user.save();

    res.json({
      success: true,
      message: 'Payment deleted successfully',
      loan: {
        remainingBalance: loan.remainingBalance,
        status: loan.status
      }
    });

  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting payment'
    });
  }
});

// ==================== LOAN ANALYTICS ROUTES ====================

// Get loan analytics and insights
router.get('/analytics/overview', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const loans = user.loans || [];

    if (loans.length === 0) {
      return res.json({
        success: true,
        message: 'No loans found',
        analytics: {}
      });
    }

    const activeLoans = loans.filter(loan => loan.status === 'active');
    const paidLoans = loans.filter(loan => loan.status === 'paid');

    // Calculate totals
    const totalBorrowed = loans.reduce((sum, loan) => sum + loan.amount, 0);
    const totalRemaining = loans.reduce((sum, loan) => sum + loan.remainingBalance, 0);
    const totalPaid = totalBorrowed - totalRemaining;
    const totalInterestPaid = loans.reduce((sum, loan) => {
      const loanInterest = loan.payments?.reduce((interestSum, payment) => interestSum + payment.interest, 0) || 0;
      return sum + loanInterest;
    }, 0);

    // Monthly obligations
    const totalMonthlyPayment = activeLoans.reduce((sum, loan) => sum + loan.monthlyPayment, 0);
    const debtToIncomeRatio = req.user.monthlyIncome > 0 ? 
      (totalMonthlyPayment / req.user.monthlyIncome) * 100 : 0;

    // Payoff timeline
    const projectedPayoffDates = activeLoans.map(loan => {
      const monthlyPrincipal = loan.monthlyPayment - (loan.remainingBalance * loan.interestRate / 100 / 12);
      const monthsRemaining = monthlyPrincipal > 0 ? loan.remainingBalance / monthlyPrincipal : 0;
      const payoffDate = new Date();
      payoffDate.setMonth(payoffDate.getMonth() + Math.ceil(monthsRemaining));
      return payoffDate;
    });

    const longestPayoffDate = projectedPayoffDates.length > 0 ? 
      new Date(Math.max(...projectedPayoffDates.map(d => d.getTime()))) : null;

    // Interest savings opportunity
    const interestSavingsOpportunity = activeLoans.reduce((savings, loan) => {
      const extraMonthly = loan.extraPayment || 0;
      if (extraMonthly > 0) {
        const monthlyInterestRate = loan.interestRate / 100 / 12;
        const remainingPayments = Math.ceil(loan.remainingBalance / (loan.monthlyPayment + extraMonthly));
        const interestWithoutExtra = calculateTotalInterest(loan.remainingBalance, loan.interestRate, loan.monthlyPayment);
        const interestWithExtra = calculateTotalInterest(loan.remainingBalance, loan.interestRate, loan.monthlyPayment + extraMonthly);
        return savings + (interestWithoutExtra - interestWithExtra);
      }
      return savings;
    }, 0);

    res.json({
      success: true,
      analytics: {
        summary: {
          totalLoans: loans.length,
          activeLoans: activeLoans.length,
          paidLoans: paidLoans.length,
          totalBorrowed,
          totalRemaining,
          totalPaid,
          totalInterestPaid,
          progress: totalBorrowed > 0 ? ((totalPaid / totalBorrowed) * 100) : 0
        },
        monthly: {
          totalPayment: totalMonthlyPayment,
          debtToIncomeRatio: parseFloat(debtToIncomeRatio.toFixed(2)),
          affordability: debtToIncomeRatio <= 36 ? 'Good' : debtToIncomeRatio <= 43 ? 'Moderate' : 'High'
        },
        timeline: {
          projectedPayoffDate: longestPayoffDate?.toISOString().split('T')[0] || null,
          interestSavingsOpportunity: parseFloat(interestSavingsOpportunity.toFixed(2))
        },
        recommendations: generateLoanRecommendations(activeLoans, totalMonthlyPayment, req.user.monthlyIncome)
      }
    });

  } catch (error) {
    console.error('Loan analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating loan analytics'
    });
  }
});

// Get debt payoff strategy (Snowball vs Avalanche)
router.get('/analytics/payoff-strategy', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const activeLoans = (user.loans || []).filter(loan => loan.status === 'active');

    if (activeLoans.length === 0) {
      return res.json({
        success: true,
        message: 'No active loans found',
        strategies: {}
      });
    }

    // Debt Snowball Strategy (smallest balance first)
    const snowballLoans = [...activeLoans].sort((a, b) => a.remainingBalance - b.remainingBalance);
    const snowballPlan = calculatePayoffPlan(snowballLoans, 'snowball');

    // Debt Avalanche Strategy (highest interest first)
    const avalancheLoans = [...activeLoans].sort((a, b) => b.interestRate - a.interestRate);
    const avalanchePlan = calculatePayoffPlan(avalancheLoans, 'avalanche');

    res.json({
      success: true,
      strategies: {
        snowball: snowballPlan,
        avalanche: avalanchePlan,
        recommendation: snowballPlan.totalInterest < avalanchePlan.totalInterest ? 'avalanche' : 'snowball'
      }
    });

  } catch (error) {
    console.error('Payoff strategy error:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating payoff strategies'
    });
  }
});

// ==================== HELPER FUNCTIONS ====================

function calculateNextPaymentDate(loan) {
  if (loan.status !== 'active' || !loan.payments || loan.payments.length === 0) {
    return loan.startDate;
  }

  const lastPayment = loan.payments[loan.payments.length - 1];
  const nextDate = new Date(lastPayment.date);
  nextDate.setMonth(nextDate.getMonth() + 1);
  return nextDate.toISOString().split('T')[0];
}

function calculateLoanStatus(loan, principalPaid) {
  if (loan.remainingBalance <= 0) return 'paid';
  if (principalPaid >= loan.amount) return 'paid';
  return loan.status || 'active';
}

function calculateTotalInterest(principal, annualRate, monthlyPayment) {
  const monthlyRate = annualRate / 100 / 12;
  let balance = principal;
  let totalInterest = 0;
  let months = 0;

  while (balance > 0 && months < 600) { // Max 50 years
    const interest = balance * monthlyRate;
    const principalPayment = monthlyPayment - interest;
    balance -= principalPayment;
    totalInterest += interest;
    months++;
    
    if (balance <= 0) break;
  }

  return totalInterest;
}

function calculatePayoffPlan(loans, strategy) {
  let totalMonths = 0;
  let totalInterest = 0;
  let currentExtra = 3000; // Assume ₹3,000 extra monthly for payoff
  const plan = [];
  
  const loanCopies = loans.map(loan => ({
    ...loan.toObject(),
    currentBalance: loan.remainingBalance
  }));

  while (loanCopies.some(loan => loan.currentBalance > 0) && totalMonths < 600) {
    totalMonths++;
    let availableExtra = currentExtra;

    // Pay minimums on all loans
    loanCopies.forEach(loan => {
      if (loan.currentBalance > 0) {
        const interest = loan.currentBalance * (loan.interestRate / 100 / 12);
        let principal = loan.monthlyPayment - interest;
        
        // Apply extra to focused loan based on strategy
        if (availableExtra > 0 && isFocusedLoan(loan, loanCopies, strategy)) {
          principal += availableExtra;
          availableExtra = 0;
        }

        loan.currentBalance = Math.max(0, loan.currentBalance - principal);
        totalInterest += interest;
      }
    });

    // Record progress
    if (totalMonths % 12 === 0 || loanCopies.every(loan => loan.currentBalance <= 0)) {
      plan.push({
        year: Math.ceil(totalMonths / 12),
        loansRemaining: loanCopies.filter(loan => loan.currentBalance > 0).length,
        totalRemaining: loanCopies.reduce((sum, loan) => sum + loan.currentBalance, 0),
        interestPaid: totalInterest
      });
    }
  }

  return {
    totalMonths,
    totalInterest: parseFloat(totalInterest.toFixed(2)),
    plan,
    description: strategy === 'snowball' ? 
      'Pay off smallest balances first for quick wins' : 
      'Pay off highest interest rates first to save money'
  };
}

function isFocusedLoan(loan, loans, strategy) {
  const activeLoans = loans.filter(l => l.currentBalance > 0);
  
  if (strategy === 'snowball') {
    return loan.currentBalance === Math.min(...activeLoans.map(l => l.currentBalance));
  } else { // avalanche
    return loan.interestRate === Math.max(...activeLoans.map(l => l.interestRate));
  }
}

function generateLoanRecommendations(loans, totalMonthly, monthlyIncome) {
  const recommendations = [];

  // Debt-to-income check
  const debtToIncome = monthlyIncome > 0 ? (totalMonthly / monthlyIncome) * 100 : 0;
  if (debtToIncome > 36) {
    recommendations.push({
      type: 'warning',
      title: 'High Debt-to-Income Ratio',
      message: `Your debt payments are ${debtToIncome.toFixed(1)}% of your income. Consider debt consolidation or increasing income.`,
      priority: 'high'
    });
  }

  // High-interest debt check
  const highInterestLoans = loans.filter(loan => loan.interestRate > 15);
  if (highInterestLoans.length > 0) {
    recommendations.push({
      type: 'warning',
      title: 'High-Interest Debt',
      message: `You have ${highInterestLoans.length} loan(s) with interest rates above 15%. Prioritize paying these off.`,
      priority: 'high'
    });
  }

  // Extra payment opportunity
  const loansWithExtra = loans.filter(loan => !loan.extraPayment || loan.extraPayment === 0);
  if (loansWithExtra.length > 0) {
    recommendations.push({
      type: 'info',
      title: 'Extra Payment Opportunity',
      message: `Consider adding extra payments to save on interest and pay off loans faster.`,
      priority: 'medium'
    });
  }

  // Good progress recognition
  const lowRemainingLoans = loans.filter(loan => loan.remainingBalance / loan.amount < 0.2);
  if (lowRemainingLoans.length > 0) {
    recommendations.push({
      type: 'success',
      title: 'Great Progress!',
      message: `You're close to paying off ${lowRemainingLoans.length} loan(s). Keep up the good work!`,
      priority: 'low'
    });
  }

  return recommendations;
}

module.exports = router;