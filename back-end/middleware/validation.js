const goalSchema = {
  title: {
    in: ['body'],
    notEmpty: true,
    isString: true,
    errorMessage: 'Goal title is required'
  },
  category: {
    in: ['body'],
    notEmpty: true,
    isString: true,
    errorMessage: 'Goal category is required'
  },
  targetAmount: {
    in: ['body'],
    isFloat: {
      options: { min: 0.01 }
    },
    errorMessage: 'Target amount must be a positive number'
  },
  deadline: {
    in: ['body'],
    notEmpty: true,
    isDate: true,
    errorMessage: 'Valid deadline is required'
  },
  priority: {
    in: ['body'],
    optional: true,
    isIn: {
      options: [['low', 'medium', 'high', 'urgent']]
    },
    errorMessage: 'Priority must be low, medium, high, or urgent'
  },
  description: {
    in: ['body'],
    optional: true,
    isString: true,
    errorMessage: 'Description must be a string'
  },
  monthlyContribution: {
    in: ['body'],
    optional: true,
    isFloat: {
      options: { min: 0 }
    },
    errorMessage: 'Monthly contribution must be a positive number'
  },
  initialAmount: {
    in: ['body'],
    optional: true,
    isFloat: {
      options: { min: 0 }
    },
    errorMessage: 'Initial amount must be a positive number'
  },
  alerts: {
    in: ['body'],
    optional: true,
    isBoolean: true,
    errorMessage: 'Alerts must be a boolean'
  }
};