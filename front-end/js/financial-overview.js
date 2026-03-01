// financial-overview.js - Complete Fixed Version
class FinancialOverview {
    constructor() {
        this.currentUser = null;
        this.financialData = null;
        this.charts = {};
        this.init();
    }

    async init() {
        console.log('📊 Initializing Financial Overview...');

        if (!(await this.checkAuthentication())) {
            return;
        }

        await this.loadFinancialData();
        this.initializeCharts();
        this.setupEventListeners();
        this.updateUI();
    }

    async checkAuthentication() {
        const token = localStorage.getItem('fintrack_token');
        const user = localStorage.getItem('fintrack_user');

        if (!user || !token) {
            this.redirectToLogin();
            return false;
        }

        try {
            const response = await this.apiCall('/auth/verify');
            if (response.success) {
                this.currentUser = response.user;
                return true;
            } else {
                this.redirectToLogin();
                return false;
            }
        } catch (error) {
            console.error('Auth verification failed:', error);
            this.redirectToLogin();
            return false;
        }
    }

    redirectToLogin() {
        setTimeout(() => {
            window.location.href = '../login.html';
        }, 1000);
    }

    async loadFinancialData() {
        try {
            this.showLoadingState();

            // Load financial overview data
            const response = await this.apiCall('/financial/overview');
            if (response && response.success) {
                this.financialData = response;
                console.log('📊 Financial overview data loaded:', {
                    totalBalance: response.totalBalance,
                    monthlyIncome: response.monthlyIncome,
                    monthlyExpenses: response.monthlyExpenses,
                    analytics: response.analytics
                });
                
                this.updateFinancialCards();
                this.updateSavingsRate();
                this.updateFinancialHealth();
                await this.updateQuickStats();
                this.updateBudgetProgress();
                this.updateCharts();
            } else {
                throw new Error('Failed to load financial data');
            }
        } catch (error) {
            console.error('Error loading financial data:', error);
            this.showMessage('Error loading financial data: ' + error.message, 'error');
        } finally {
            this.hideLoadingState();
        }
    }

    updateFinancialCards() {
        if (!this.financialData) return;

        const totalBalanceEl = document.getElementById('totalBalance');
        if (totalBalanceEl) totalBalanceEl.textContent = this.formatCurrency(this.financialData.totalBalance);

        const totalIncomeEl = document.getElementById('totalIncome');
        if (totalIncomeEl) totalIncomeEl.textContent = this.formatCurrency(this.financialData.monthlyIncome);

        const totalExpensesEl = document.getElementById('totalExpenses');
        if (totalExpensesEl) totalExpensesEl.textContent = this.formatCurrency(this.financialData.monthlyExpenses);

        const totalSavingsEl = document.getElementById('totalSavings');
        if (totalSavingsEl) totalSavingsEl.textContent = this.formatCurrency(this.financialData.monthlySavings);
    }

    updateSavingsRate() {
        if (!this.financialData) return;

        const savingsRate = this.financialData.monthlyIncome > 0 ?
            (this.financialData.monthlySavings / this.financialData.monthlyIncome) * 100 : 0;

        const savingsRateEl = document.getElementById('savingsRateValue');
        if (savingsRateEl) savingsRateEl.textContent = `${savingsRate.toFixed(1)}%`;

        const breakdownIncomeEl = document.getElementById('breakdownIncome');
        if (breakdownIncomeEl) breakdownIncomeEl.textContent = this.formatCurrency(this.financialData.monthlyIncome);

        const breakdownExpensesEl = document.getElementById('breakdownExpenses');
        if (breakdownExpensesEl) breakdownExpensesEl.textContent = this.formatCurrency(this.financialData.monthlyExpenses);

        const breakdownSavingsEl = document.getElementById('breakdownSavings');
        if (breakdownSavingsEl) breakdownSavingsEl.textContent = this.formatCurrency(this.financialData.monthlySavings);

        // Update savings rate circle
        const savingsCircle = document.querySelector('.savings-rate-circle');
        if (savingsCircle) {
            savingsCircle.style.setProperty('--savings-rate', `${savingsRate}%`);
        }
    }

    updateFinancialHealth() {
        if (!this.financialData) return;

        const analytics = this.financialData.analytics || {};
        const healthScore = analytics.healthScore || 0;

        const healthScoreEl = document.getElementById('healthScore');
        if (healthScoreEl) healthScoreEl.textContent = Math.round(healthScore);

        // Update progress bars
        this.updateProgressBar('savingsRateBar', analytics.savingsRate || 0, '#28a745');
        this.updateProgressBar('emergencyFundBar', Math.min(100, (analytics.emergencyFundMonths || 0) * 20), '#17a2b8');
        this.updateProgressBar('debtManagementBar', Math.max(0, 100 - (analytics.debtToIncome || 0) * 100), '#ffc107');
        this.updateProgressBar('goalProgressBar', analytics.averageGoalProgress || 0, '#6f42c1');

        // Update metric values
        const savingsRateMetric = document.getElementById('savingsRateMetric');
        if (savingsRateMetric) savingsRateMetric.textContent = `${(analytics.savingsRate || 0).toFixed(1)}%`;

        const emergencyFundMetric = document.getElementById('emergencyFundMetric');
        if (emergencyFundMetric) emergencyFundMetric.textContent = `${(analytics.emergencyFundMonths || 0).toFixed(1)} months`;

        const debtManagementMetric = document.getElementById('debtManagementMetric');
        if (debtManagementMetric) debtManagementMetric.textContent = `${(100 - (analytics.debtToIncome || 0) * 100).toFixed(1)}%`;

        const goalProgressMetric = document.getElementById('goalProgressMetric');
        if (goalProgressMetric) goalProgressMetric.textContent = `${(analytics.averageGoalProgress || 0).toFixed(1)}%`;
    }

    updateProgressBar(elementId, value, color) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.width = `${Math.min(100, Math.max(0, value))}%`;
            element.style.background = color;
        }
    }

    async updateQuickStats() {
        if (!this.financialData) return;

        const analytics = this.financialData.analytics || {};

        console.log('📈 Updating quick stats...');

        // Update transactions count
        const totalTransactionsEl = document.getElementById('totalTransactions');
        if (totalTransactionsEl) {
            totalTransactionsEl.textContent = this.financialData.recentTransactions ? 
                this.financialData.recentTransactions.length : 0;
        }

        // Update active budgets - FIXED: Use analytics data
        const activeBudgetsEl = document.getElementById('activeBudgets');
        if (activeBudgetsEl) {
            activeBudgetsEl.textContent = analytics.activeBudgets || 0;
            console.log('💰 Active budgets:', analytics.activeBudgets);
        }

        // Update active goals - FIXED: Use analytics data
        const activeGoalsEl = document.getElementById('activeGoals');
        if (activeGoalsEl) {
            activeGoalsEl.textContent = analytics.activeGoals || 0;
            console.log('🎯 Active goals:', analytics.activeGoals);
        }

        // Update savings consistency
        const savingsConsistencyEl = document.getElementById('savingsConsistency');
        if (savingsConsistencyEl) {
            savingsConsistencyEl.textContent = `${(analytics.savingsConsistency || 0).toFixed(1)}%`;
        }

        // Update average monthly income
        const avgMonthlyIncomeEl = document.getElementById('avgMonthlyIncome');
        if (avgMonthlyIncomeEl) {
            avgMonthlyIncomeEl.textContent = this.formatCurrency(analytics.avgMonthlyIncome || 0);
        }

        // Update loans data - FIXED: Always use localStorage loans
        try {
            console.log('🏦 Loading loans data...');
            const loans = this.getLoansFromLocalStorage();
            const activeLoans = loans.filter(loan => 
                (loan.remainingBalance || loan.amount) > 0
            );

            console.log(`📊 Found ${activeLoans.length} active loans in localStorage`);

            // Update active loans count
            const activeLoansEl = document.getElementById('activeLoans');
            if (activeLoansEl) activeLoansEl.textContent = activeLoans.length;

            // Calculate completion percentage
            let avgCompletion = 0;
            if (activeLoans.length > 0) {
                const completions = activeLoans.map(loan => {
                    // Use metrics progress if available
                    if (loan.metrics && loan.metrics.progress !== undefined) {
                        return Math.min(100, Math.max(0, loan.metrics.progress));
                    }

                    // Calculate manually if metrics not available
                    const principalPaid = (loan.payments || []).reduce((sum, payment) => 
                        sum + (payment.principal || 0), 0
                    );
                    const totalAmount = loan.amount || 1;
                    const completion = totalAmount > 0 ? (principalPaid / totalAmount) * 100 : 0;
                    return Math.min(100, Math.max(0, completion));
                });
                avgCompletion = completions.reduce((sum, comp) => sum + comp, 0) / completions.length;
            }

            const loansCompletionEl = document.getElementById('loansCompletionOverview');
            if (loansCompletionEl) {
                loansCompletionEl.textContent = `${avgCompletion.toFixed(1)}%`;
            }

            // Render loans panel
            this.renderActiveLoansPanel(activeLoans);

        } catch (error) {
            console.error('Error processing loans from localStorage:', error);
        }
        
        // Update average monthly expenses
        const avgMonthlyExpensesEl = document.getElementById('avgMonthlyExpenses');
        if (avgMonthlyExpensesEl) {
            avgMonthlyExpensesEl.textContent = this.formatCurrency(analytics.avgMonthlyExpenses || 0);
        }
    }

    getLoansFromLocalStorage() {
        function getLoansStorageKey() {
            try {
                const user = JSON.parse(localStorage.getItem('fintrack_user'));
                const idFromUser = user && (user._id || user.id || user.userId || user.email);
                if (idFromUser) return `loans_${idFromUser}`;

                const token = localStorage.getItem('fintrack_token');
                if (token) {
                    try {
                        const payload = JSON.parse(atob(token.split('.')[1]));
                        const tid = payload && (payload.userId || payload.userID || payload.user_id || payload.user);
                        if (tid) return `loans_${tid}`;
                    } catch (e) { /* ignore */ }
                }

                return 'loans_guest';
            } catch (e) {
                return 'loans_guest';
            }
        }

        const expectedKey = getLoansStorageKey();
        let loans = JSON.parse(localStorage.getItem(expectedKey)) || [];
        
        console.log('🔍 Financial Overview - localStorage loans check:', {
            expectedKey,
            loansCount: loans.length
        });
        
        // If expected key is empty, scan for any loans data
        if (loans.length === 0) {
            console.log('🔄 Financial Overview - Scanning all localStorage for loans...');
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key === 'loans' || key.startsWith('loans_'))) {
                    try {
                        const foundLoans = JSON.parse(localStorage.getItem(key)) || [];
                        if (foundLoans.length > 0) {
                            loans = foundLoans;
                            console.log('✅ Financial Overview - Found loans in key:', key, 'count:', loans.length);
                            break;
                        }
                    } catch (e) {
                        console.warn('Financial Overview - Error parsing loans from key:', key, e);
                    }
                }
            }
        }

        return loans;
    }

    renderActiveLoansPanel(loans) {
        const panel = document.getElementById('activeLoansPanel');
        if (!panel) return;

        if (!loans || loans.length === 0) {
            panel.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-bank2 display-4 text-muted"></i>
                    <p class="mt-3 text-muted">No active loans</p>
                    <button class="btn btn-primary btn-sm" onclick="window.location.href='loan-calculator.html'">Add Loan</button>
                </div>
            `;
            return;
        }

        panel.innerHTML = loans.map(loan => {
            const progress = loan.metrics?.progress || 
                (loan.amount > 0 ? (((loan.payments || []).reduce((s, p) => s + (p.principal || 0), 0) / loan.amount) * 100) : 0);
            
            return `
            <div class="loan-item">
                <div class="loan-meta">
                    <div class="loan-title">${loan.name || 'Unnamed Loan'}</div>
                    <div class="loan-sub">Remaining: ${this.formatCurrency(loan.remainingBalance || loan.amount || 0)} • EMI: ${this.formatCurrency(loan.monthlyPayment || 0)}</div>
                </div>
                <div class="loan-progress">
                    <div class="progress progress-small">
                        <div class="progress-bar bg-primary" role="progressbar" style="width: ${Math.min(100, progress)}%"></div>
                    </div>
                    <div class="progress-text-small">${progress.toFixed(1)}%</div>
                </div>
                <div class="loan-actions">
                    <button class="btn btn-sm btn-outline-secondary" onclick="viewLoan('${loan._id || loan.id}')">View</button>
                    <button class="btn btn-sm btn-outline-primary" onclick="addLoanPayment('${loan._id || loan.id}')">Add Payment</button>
                </div>
            </div>
        `}).join('');
    }

    updateBudgetProgress() {
        const container = document.getElementById('budgetProgress');
        if (!container || !this.financialData) return;

        const budgets = this.financialData.budgetStatus || [];

        if (budgets.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-wallet2 display-4 text-muted"></i>
                    <p class="mt-3 text-muted">No budgets set yet</p>
                    <button class="btn btn-primary btn-sm" onclick="window.location.href='budgets.html'">
                        Create Your First Budget
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = budgets.map(budget => `
            <div class="budget-item">
                <div class="budget-header">
                    <span class="budget-category">${budget.category}</span>
                    <span class="budget-status ${budget.status}">
                        ${budget.status === 'exceeded' ? 'Exceeded' :
                budget.status === 'warning' ? 'Warning' : 'On Track'}
                    </span>
                </div>
                <div class="progress budget-bar">
                    <div class="progress-bar ${budget.status}" 
                         style="width: ${Math.min(budget.percentage, 100)}%">
                    </div>
                </div>
                <div class="budget-numbers">
                    <span class="spent">${this.formatCurrency(budget.spent)} spent</span>
                    <span class="limit">${this.formatCurrency(budget.limit)} limit</span>
                    <span class="remaining ${budget.remaining < 0 ? 'negative' : 'positive'}">
                        ${this.formatCurrency(Math.abs(budget.remaining))} ${budget.remaining < 0 ? 'over' : 'left'}
                    </span>
                </div>
            </div>
        `).join('');
    }

    initializeCharts() {
        this.initializeIncomeExpenseChart();
        this.initializeCategoryChart();
        this.initializeMonthlyTrendChart();
    }

    initializeIncomeExpenseChart() {
        const ctx = document.getElementById('incomeExpenseChart');
        if (!ctx) return;

        if (this.charts.incomeExpense) {
            this.charts.incomeExpense.destroy();
        }

        // Use actual data from financial overview
        const monthlyTrends = this.financialData?.analytics?.monthlyTrends || [];
        
        if (monthlyTrends.length === 0) {
            // Fallback to sample data
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
            const income = [50000, 52000, 48000, 55000, 53000, 56000];
            const expenses = [35000, 38000, 32000, 40000, 37000, 39000];

            this.charts.incomeExpense = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: months,
                    datasets: [
                        {
                            label: 'Income',
                            data: income,
                            borderColor: '#28a745',
                            backgroundColor: 'rgba(40, 167, 69, 0.1)',
                            tension: 0.4,
                            fill: true
                        },
                        {
                            label: 'Expenses',
                            data: expenses,
                            borderColor: '#dc3545',
                            backgroundColor: 'rgba(220, 53, 69, 0.1)',
                            tension: 0.4,
                            fill: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                label: (context) => {
                                    return `${context.dataset.label}: ${this.formatCurrency(context.raw)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: (value) => this.formatCurrencyCompact(value)
                            }
                        }
                    }
                }
            });
            return;
        }

        // Use actual data
        const labels = monthlyTrends.map(trend => trend.month);
        const incomeData = monthlyTrends.map(trend => trend.income);
        const expensesData = monthlyTrends.map(trend => trend.expenses);

        this.charts.incomeExpense = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Income',
                        data: incomeData,
                        borderColor: '#28a745',
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Expenses',
                        data: expensesData,
                        borderColor: '#dc3545',
                        backgroundColor: 'rgba(220, 53, 69, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: (context) => {
                                return `${context.dataset.label}: ${this.formatCurrency(context.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => this.formatCurrencyCompact(value)
                        }
                    }
                }
            }
        });
    }

    initializeCategoryChart() {
        const ctx = document.getElementById('categoryChart');
        if (!ctx) return;

        if (this.charts.category) {
            this.charts.category.destroy();
        }

        // Use actual data from financial overview
        const monthlySpending = this.financialData?.monthlySpendingByCategory || {};

        if (Object.keys(monthlySpending).length === 0) {
            // Fallback to sample data
            const categories = {
                'Food & Dining': 12000,
                'Transportation': 8000,
                'Entertainment': 5000,
                'Bills & Utilities': 7000,
                'Shopping': 6000,
                'Healthcare': 3000
            };

            const categoryNames = Object.keys(categories);
            const amounts = Object.values(categories);

            this.charts.category = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: categoryNames,
                    datasets: [{
                        data: amounts,
                        backgroundColor: [
                            '#4361ee', '#4cc9f0', '#7209b7', '#f72585',
                            '#4ade80', '#f59e0b', '#ef4444', '#8b5cf6'
                        ],
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 20,
                                usePointStyle: true
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const label = context.label || '';
                                    const value = context.raw || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((value / total) * 100).toFixed(1);
                                    return `${label}: ${this.formatCurrency(value)} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
            return;
        }

        // Use actual data
        const categoryNames = Object.keys(monthlySpending);
        const amounts = Object.values(monthlySpending);

        this.charts.category = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categoryNames,
                datasets: [{
                    data: amounts,
                    backgroundColor: [
                        '#4361ee', '#4cc9f0', '#7209b7', '#f72585',
                        '#4ade80', '#f59e0b', '#ef4444', '#8b5cf6'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${this.formatCurrency(value)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    initializeMonthlyTrendChart() {
        const ctx = document.getElementById('monthlyTrendChart');
        if (!ctx) return;

        if (this.charts.monthlyTrend) {
            this.charts.monthlyTrend.destroy();
        }

        // Use actual data from financial overview
        const monthlyTrends = this.financialData?.analytics?.monthlyTrends || [];

        if (monthlyTrends.length === 0) {
            // Fallback to sample data
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
            const savings = [15000, 14000, 16000, 15000, 16000, 17000];

            this.charts.monthlyTrend = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: months,
                    datasets: [{
                        label: 'Monthly Savings',
                        data: savings,
                        backgroundColor: 'rgba(23, 162, 184, 0.8)',
                        borderColor: '#17a2b8',
                        borderWidth: 2,
                        borderRadius: 5
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    return `Savings: ${this.formatCurrency(context.raw)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: (value) => this.formatCurrencyCompact(value)
                            }
                        }
                    }
                }
            });
            return;
        }

        // Use actual data
        const labels = monthlyTrends.map(trend => trend.month);
        const savingsData = monthlyTrends.map(trend => trend.savings);

        this.charts.monthlyTrend = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Monthly Savings',
                    data: savingsData,
                    backgroundColor: 'rgba(23, 162, 184, 0.8)',
                    borderColor: '#17a2b8',
                    borderWidth: 2,
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `Savings: ${this.formatCurrency(context.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => this.formatCurrencyCompact(value)
                        }
                    }
                }
            }
        });
    }

    updateCharts() {
        // Charts are already initialized with data
        // This method can be used to update charts if needed
    }

    setupEventListeners() {
        // Period selector
        const overviewPeriod = document.getElementById('overviewPeriod');
        if (overviewPeriod) {
            overviewPeriod.addEventListener('change', () => this.loadFinancialData());
        }

        // Chart type selector
        const trendChartType = document.getElementById('trendChartType');
        if (trendChartType) {
            trendChartType.addEventListener('change', () => this.updateChartType());
        }

        // Category period selector
        const categoryPeriod = document.getElementById('categoryPeriod');
        if (categoryPeriod) {
            categoryPeriod.addEventListener('change', () => this.updateCategoryChart());
        }

        // Trend period selector
        const trendPeriod = document.getElementById('trendPeriod');
        if (trendPeriod) {
            trendPeriod.addEventListener('change', () => this.updateTrendChart());
        }

        // Logout button
        document.addEventListener('click', (e) => {
            if (e.target.closest('#logoutLink') || e.target.closest('.logout-btn')) {
                e.preventDefault();
                this.logout();
            }
        });

        // Listen for updates from other parts of the app
        document.addEventListener('transactionUpdated', () => {
            this.loadFinancialData();
        });

        document.addEventListener('budgetsUpdated', () => {
            this.loadFinancialData();
        });

        document.addEventListener('goalsUpdated', () => {
            this.loadFinancialData();
        });

        // Listen for loan updates
        document.addEventListener('loansUpdated', () => {
            console.log('🔄 Loans updated event received in financial overview');
            this.updateQuickStats();
        });

        // Listen for cross-tab updates
        window.addEventListener('storage', (e) => {
            if (e.key === 'fintrack_transactions_updated' || 
                e.key === 'fintrack_budgets_updated' || 
                e.key === 'fintrack_goals_updated' ||
                e.key === 'fintrack_loans_updated') {
                this.loadFinancialData();
            }
        });
    }

    updateChartType() {
        const chartType = document.getElementById('trendChartType').value;
        if (this.charts.incomeExpense) {
            this.charts.incomeExpense.destroy();
            this.initializeIncomeExpenseChart();
        }
    }

    updateCategoryChart() {
        this.loadFinancialData();
    }

    updateTrendChart() {
        this.loadFinancialData();
    }

    updateUI() {
        this.updateFinancialCards();
        this.updateSavingsRate();
    }

    showLoadingState() {
        const elements = document.querySelectorAll('.financial-card, .chart-card, .stats-card');
        elements.forEach(element => {
            element.classList.add('loading');
        });
    }

    hideLoadingState() {
        const elements = document.querySelectorAll('.financial-card, .chart-card, .stats-card');
        elements.forEach(element => {
            element.classList.remove('loading');
        });
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount);
    }

    formatCurrencyCompact(amount) {
        if (Math.abs(amount) >= 10000000) {
            return '₹' + (Math.abs(amount) / 10000000).toFixed(2) + 'Cr';
        } else if (Math.abs(amount) >= 100000) {
            return '₹' + (Math.abs(amount) / 100000).toFixed(2) + 'L';
        } else if (Math.abs(amount) >= 1000) {
            return '₹' + (Math.abs(amount) / 1000).toFixed(2) + 'K';
        } else {
            return '₹' + Math.abs(amount).toFixed(2);
        }
    }

    async apiCall(endpoint, options = {}) {
        if (window.AuthUtils && typeof AuthUtils.apiCall === 'function') {
            return AuthUtils.apiCall(endpoint, options);
        }

        // Fallback implementation
        const token = localStorage.getItem('fintrack_token');
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...options.headers
            }
        };

        try {
            const url = `http://localhost:3001/api${endpoint}`;
            const response = await fetch(url, {
                ...defaultOptions,
                ...options,
                body: options.body ? JSON.stringify(options.body) : undefined
            });

            const data = await response.json();

            if (!response.ok) {
                const err = new Error(data.message || `HTTP error! status: ${response.status}`);
                err.status = response.status;
                throw err;
            }

            return data;
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    }

    showMessage(message, type = 'info') {
        if (window.AuthUtils && window.AuthUtils.showMessage) {
            window.AuthUtils.showMessage(message, type);
        } else {
            // Fallback notification
            const alertClass = type === 'error' ? 'alert-danger' :
                type === 'success' ? 'alert-success' :
                    type === 'warning' ? 'alert-warning' : 'alert-info';

            const alertDiv = document.createElement('div');
            alertDiv.className = `alert ${alertClass} alert-dismissible fade show position-fixed`;
            alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
            alertDiv.innerHTML = `
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;

            document.body.appendChild(alertDiv);

            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.parentNode.removeChild(alertDiv);
                }
            }, 5000);
        }
    }

    logout() {
        localStorage.removeItem('fintrack_token');
        localStorage.removeItem('fintrack_user');

        this.showMessage('Logged out successfully', 'info');

        setTimeout(() => {
            window.location.href = '../index.html';
        }, 1000);
    }
}

// Global functions for financial overview
function viewLoan(loanId) {
    window.location.href = `loan-calculator.html#loan-${loanId}`;
}

function addLoanPayment(loanId) {
    window.location.href = `loan-calculator.html#payment-${loanId}`;
}

// Initialize financial overview when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.financialOverview = new FinancialOverview();
});