// dashboard.js - Enhanced Dashboard Management with Fast Loading
class Dashboard {
    constructor() {
        this.currentUser = null;
        this.financialData = null;
        this.init();
    }

    async init() {
        console.log('📊 Initializing Dashboard...');

        // Debug authentication status first
        console.log('🔐 Checking authentication status...');
        if (window.AuthUtils) {
            AuthUtils.debugAuthStatus();
        }

        if (!(await this.checkAuth())) {
            return;
        }

        // Fast path: show loans from localStorage immediately while network calls run
        try { this.updateLoansFromLocalStorage(); } catch (e) { console.warn('Fast loans render failed', e); }

        await this.loadDashboardData();
        this.setupEventListeners();
        this.initializeDate();
        // Add temporary debug button for loans
        try { this.addDebugLoansButton(); } catch (e) { /* ignore */ }
    }

    addDebugLoansButton() {
        // Don't add more than once
        if (document.getElementById('debugLoansBtn')) return;

        const header = document.querySelector('.dashboard-header .container .row');
        if (!header) return;

        const btnCol = document.createElement('div');
        btnCol.className = 'col-12 text-end mt-2';
        btnCol.style.pointerEvents = 'auto';

        const btn = document.createElement('button');
        btn.id = 'debugLoansBtn';
        btn.className = 'btn btn-sm btn-outline-secondary';
        btn.textContent = 'Debug loans';
        btn.title = 'Print loans and localStorage loan keys to console';
        btn.addEventListener('click', () => this.printLoansDebug());

        btnCol.appendChild(btn);
        header.parentElement.insertBefore(btnCol, header.nextSibling);
    }

    printLoansDebug() {
        console.group('🔍 Loans debug');
        try {
            console.log('Auth user:', localStorage.getItem('fintrack_user'));
            const found = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!key) continue;
                if (key === 'loans' || key === 'loans_guest' || key.startsWith('loans_')) {
                    try {
                        const arr = JSON.parse(localStorage.getItem(key)) || [];
                        console.log('Key:', key, 'count:', arr.length, 'sample:', arr.slice(0, 3));
                        found.push({ key, count: arr.length });
                    } catch (e) {
                        console.warn('Key:', key, 'parse error', e);
                    }
                }
            }
            if (found.length === 0) console.log('No loan-related keys found in localStorage');
        } catch (e) {
            console.error('printLoansDebug error', e);
        }
        console.groupEnd();
    }

    async checkAuth() {
        console.log('🔐 Checking authentication...');

        if (!window.AuthUtils) {
            console.error('❌ AuthUtils not available');
            window.location.href = '../login.html';
            return false;
        }

        if (!AuthUtils.isAuthenticated()) {
            console.warn('❌ User not authenticated, redirecting to login...');
            window.location.href = '../login.html';
            return false;
        }

        // Verify token is still valid
        try {
            console.log('🔐 Verifying token with server...');
            const response = await AuthUtils.apiCall('/auth/verify');
            if (response.success) {
                this.currentUser = response.user;
                this.updateUserInfo();
                console.log('✅ Authentication verified successfully');
                return true;
            } else {
                console.error('❌ Auth verification failed - no success');
                window.location.href = '../login.html';
                return false;
            }
        } catch (error) {
            console.error('❌ Auth verification failed:', error);
            if (error.status === 401 || error.status === 403) {
                window.location.href = '../login.html';
            }
            return false;
        }
    }

    updateUserInfo() {
        if (!this.currentUser) return;

        const welcomeElement = document.getElementById('welcomeMessage');
        if (welcomeElement) {
            welcomeElement.textContent = `Welcome back, ${this.currentUser.firstName}!`;
        }

        // Update any other user info elements
        const userElements = document.querySelectorAll('[data-user]');
        userElements.forEach(element => {
            const property = element.getAttribute('data-user');
            if (property === 'name') {
                element.textContent = `${this.currentUser.firstName} ${this.currentUser.lastName}`;
            } else if (property === 'firstName') {
                element.textContent = this.currentUser.firstName;
            }
        });
    }

    initializeDate() {
        const dateElement = document.getElementById('dashboardDate');
        if (dateElement) {
            const now = new Date();
            const options = {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            };
            dateElement.textContent = now.toLocaleDateString('en-US', options);
        }
    }

    setupEventListeners() {
        console.log('🔧 Setting up event listeners...');

        // Add transaction modal
        document.addEventListener('shown.bs.modal', (e) => {
            if (e.target.id === 'addTransactionModal') {
                this.setupTransactionModal();
            }
        });

        // Refresh data when transactions are updated
        document.addEventListener('transactionUpdated', () => {
            console.log('🔄 Transaction updated - refreshing dashboard');
            this.loadDashboardData();
        });

        document.addEventListener('budgetsUpdated', () => {
            this.loadDashboardData();
        });

        document.addEventListener('goalsUpdated', () => {
            this.loadDashboardData();
        });

        // Listen for loan updates from loan calculator
        document.addEventListener('loansUpdated', (e) => {
            console.log('🔄 Loans updated event received');
            // Refresh loan data immediately
            this.updateLoansFromLocalStorage();
            if (this.loadDashboardData) {
                this.loadDashboardData();
            }
        });

        // Cross-tab synchronization
        window.addEventListener('storage', (e) => {
            console.debug('[Dashboard][storage] key:', e.key, 'newValue:', e.newValue);
            if (e.key === 'fintrack_transactions_updated' ||
                e.key === 'fintrack_budgets_updated' ||
                e.key === 'fintrack_goals_updated' ||
                e.key === 'fintrack_loans_updated') {
                this.loadDashboardData();
            }
        });

        // Logout
        document.addEventListener('click', (e) => {
            if (e.target.closest('#logoutLink') || e.target.closest('.logout-btn')) {
                e.preventDefault();
                if (window.authManager) {
                    window.authManager.logout();
                }
            }
        });

        // Manual refresh button
        const refreshBtn = document.getElementById('refreshDashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadDashboardData();
            });
        }

        console.log('✅ Event listeners setup complete');
    }

    setupTransactionModal() {
        const dateInput = document.getElementById('transactionDate');
        if (dateInput && !dateInput.value) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }
    }

    async loadDashboardData() {
        try {
            console.log('📊 Loading dashboard data...');
            this.showLoadingState();

            // Fast path: Update UI with cached data first
            this.updateCachedUI();

            if (!window.AuthUtils) {
                console.error('AuthUtils is not available. Redirecting to login.');
                window.location.href = '../login.html';
                return;
            }

            console.log('🧪 Fetching overview and loans in parallel...');
            
            // Use Promise.allSettled to handle both requests independently
            const [overviewResult, loansResult] = await Promise.allSettled([
                AuthUtils.apiCall('/financial/overview').catch(err => ({ error: err })),
                AuthUtils.apiCall('/loans').catch(err => ({ error: err }))
            ]);

            // Process overview data
            if (overviewResult.status === 'fulfilled' && overviewResult.value && !overviewResult.value.error) {
                this.financialData = overviewResult.value;
                console.log('✅ Dashboard overview loaded');
                this.updateDashboardUI();
            } else {
                console.warn('⚠️ Failed to load financial overview:', overviewResult.reason || overviewResult.value?.error);
                // Don't show error for overview - use cached data
            }

            // Process loans data
            if (loansResult.status === 'fulfilled' && loansResult.value && !loansResult.value.error) {
                this.processLoansData(loansResult.value);
            } else {
                console.warn('⚠️ Failed to load loans data, using localStorage fallback');
                this.updateLoansFromLocalStorage();
            }

        } catch (error) {
            console.error('❌ Error loading dashboard data:', error);
            // Don't show full error state for network issues
            this.showPartialErrorState(error);
        } finally {
            this.hideLoadingState();
        }
    }

    updateCachedUI() {
        // Update with any cached data we have immediately
        const user = AuthUtils.getUser();
        if (user) {
            this.updateUserInfo();
        }
        
        // Update loans from localStorage for immediate display
        this.updateLoansFromLocalStorage();
    }

    processLoansData(loansResponse) {
    try {
        let loans = [];
        
        // FIX: Check if backend returned actual loan data, not just empty array
        const hasBackendLoans = loansResponse && 
                               loansResponse.success && 
                               Array.isArray(loansResponse.loans) && 
                               loansResponse.loans.length > 0;
        
        if (hasBackendLoans) {
            loans = loansResponse.loans;
            console.debug('[Dashboard] Using backend loans:', loans.length);
        } else {
            // Fallback to localStorage - FIXED: Always use localStorage if backend is empty
            loans = this.getLoansFromLocalStorage();
            console.debug('[Dashboard] Backend returned empty loans, using localStorage:', loans.length);
        }

        const activeLoans = loans.filter(l => (l.remainingBalance || l.amount) > 0);
        const activeLoansCountEl = document.getElementById('activeLoansCount');
        if (activeLoansCountEl) activeLoansCountEl.textContent = activeLoans.length;

        // Calculate completion percentage
        let avgCompletion = 0;
        if (activeLoans.length > 0) {
            const totals = activeLoans.map(l => {
                // Use metrics progress if available
                if (l.metrics && l.metrics.progress !== undefined) {
                    return Math.min(100, Math.max(0, l.metrics.progress));
                }

                // Calculate manually if metrics not available
                const principalPaid = (l.payments || []).reduce((s, p) => s + (p.principal || 0), 0);
                const totalAmount = l.amount || 1;
                const completion = totalAmount > 0 ? (principalPaid / totalAmount) * 100 : 0;
                return Math.min(100, Math.max(0, completion));
            });
            avgCompletion = totals.reduce((a, b) => a + b, 0) / totals.length;
        }

        const loansCompletionEl = document.getElementById('loansCompletion');
        if (loansCompletionEl) loansCompletionEl.textContent = `${avgCompletion.toFixed(1)}%`;

        // Render a compact loans panel (dashboard) quickly
        this.renderActiveLoansPanelLocal(activeLoans);

    } catch (e) {
        console.warn('Failed to process loans data', e);
        this.updateLoansFromLocalStorage();
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
        
        // If expected key is empty, scan for any loans data
        if (loans.length === 0) {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key === 'loans' || key.startsWith('loans_'))) {
                    try {
                        const foundLoans = JSON.parse(localStorage.getItem(key)) || [];
                        if (foundLoans.length > 0) {
                            loans = foundLoans;
                            console.debug('[Dashboard] Found loans in key:', key, 'count:', loans.length);
                            break;
                        }
                    } catch (e) {
                        // Ignore parse errors
                    }
                }
            }
        }

        return loans;
    }

    updateLoansFromLocalStorage() {
        try {
            const loans = this.getLoansFromLocalStorage();
            console.debug('[Dashboard][updateLoansFromLocalStorage] loans read:', loans.length);
            const activeLoans = loans.filter(l => (l.remainingBalance || l.amount) > 0);

            const countEl = document.getElementById('activeLoansCount');
            if (countEl) countEl.textContent = activeLoans.length;

            // Calculate completion percentage - FIXED CALCULATION
            let avgCompletion = 0;
            if (activeLoans.length > 0) {
                const totals = activeLoans.map(l => {
                    // Use metrics progress if available
                    if (l.metrics && l.metrics.progress !== undefined) {
                        return Math.min(100, Math.max(0, l.metrics.progress));
                    }

                    // Calculate manually if metrics not available
                    const principalPaid = (l.payments || []).reduce((s, p) => s + (p.principal || 0), 0);
                    const totalAmount = l.amount || 1;
                    const completion = totalAmount > 0 ? (principalPaid / totalAmount) * 100 : 0;
                    return Math.min(100, Math.max(0, completion));
                });
                avgCompletion = totals.reduce((a, b) => a + b, 0) / totals.length;
            }

            const loansCompletionEl = document.getElementById('loansCompletion');
            if (loansCompletionEl) loansCompletionEl.textContent = `${avgCompletion.toFixed(1)}%`;

            this.renderActiveLoansPanelLocal(activeLoans);
        } catch (e) {
            console.warn('Failed to update loans from localStorage', e);
        }
    }

    updateDashboardUI() {
        if (!this.financialData) {
            console.warn('⚠️ No financial data available for UI update');
            return;
        }

        console.log('🎨 Updating dashboard UI...');
        this.updateFinancialCards();
        this.updateRecentTransactions();
        this.updateBudgetProgress();
        this.updateGoalsProgress();
        this.updateQuickStats();
        this.generateQuickInsights();
        console.log('✅ Dashboard UI updated successfully');
    }

    updateFinancialCards() {
        const data = this.financialData;
        console.log('💳 Updating financial cards with data:', {
            totalBalance: data.totalBalance,
            monthlyIncome: data.monthlyIncome,
            monthlyExpenses: data.monthlyExpenses,
            monthlySavings: data.monthlySavings
        });

        const totalBalanceElement = document.getElementById('totalBalance');
        if (totalBalanceElement) {
            totalBalanceElement.textContent = this.formatCurrency(data.totalBalance);
            console.log('💰 Total balance updated:', data.totalBalance);
        }

        const monthlyIncomeElement = document.getElementById('monthlyIncome');
        if (monthlyIncomeElement) {
            monthlyIncomeElement.textContent = this.formatCurrency(data.monthlyIncome);
        }

        const monthlyExpensesElement = document.getElementById('monthlyExpenses');
        if (monthlyExpensesElement) {
            monthlyExpensesElement.textContent = this.formatCurrency(data.monthlyExpenses);
        }

        const monthlySavingsElement = document.getElementById('monthlySavings');
        if (monthlySavingsElement) {
            monthlySavingsElement.textContent = this.formatCurrency(data.monthlySavings);
        }
    }

    updateRecentTransactions() {
        const container = document.getElementById('recentTransactions');
        if (!container) {
            console.warn('⚠️ Recent transactions container not found');
            return;
        }

        const transactions = this.financialData.recentTransactions || [];
        console.log('📝 Updating recent transactions:', transactions.length);

        if (transactions.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-receipt display-4 text-muted"></i>
                    <p class="mt-3 text-muted">No transactions yet</p>
                    <button class="btn btn-primary btn-sm" onclick="showAddTransactionModal()">
                        Add Your First Transaction
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = transactions.map(transaction => `
            <div class="transaction-item ${transaction.type}" 
                 onclick="viewTransactionDetails('${transaction._id}')"
                 style="cursor: pointer;">
                <div class="transaction-icon">
                    <i class="bi ${transaction.type === 'income' ? 'bi-arrow-down-left text-success' : 'bi-arrow-up-right text-danger'}"></i>
                </div>
                <div class="transaction-details">
                    <div class="transaction-category">${this.escapeHtml(transaction.category)}</div>
                    <div class="transaction-description">${this.escapeHtml(transaction.description)}</div>
                    <div class="transaction-date">${this.formatDate(transaction.date)}</div>
                </div>
                <div class="transaction-amount ${transaction.type}">
                    ${transaction.type === 'income' ? '+' : '-'}${this.formatCurrencyCompact(transaction.amount)}
                </div>
            </div>
        `).join('');
    }

    updateBudgetProgress() {
        const container = document.getElementById('budgetProgress');
        if (!container) {
            console.warn('⚠️ Budget progress container not found');
            return;
        }

        const budgets = this.financialData.budgetStatus || [];
        console.log('📊 Updating budget progress:', budgets.length);

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

        container.innerHTML = budgets.slice(0, 3).map(budget => `
            <div class="budget-item">
                <div class="budget-header">
                    <span class="budget-category">${this.escapeHtml(budget.category)}</span>
                    <span class="budget-status ${budget.status}">
                        ${budget.status === 'exceeded' ? 'Exceeded' :
                budget.status === 'warning' ? 'Warning' : 'On Track'}
                    </span>
                </div>
                <div class="progress budget-bar">
                    <div class="progress-bar ${this.getProgressBarClass(budget.percentage)}" 
                         role="progressbar" 
                         style="width: ${Math.min(budget.percentage, 100)}%"
                         aria-valuenow="${budget.percentage}" 
                         aria-valuemin="0" 
                         aria-valuemax="100">
                        <span class="progress-text">${budget.percentage.toFixed(1)}%</span>
                    </div>
                </div>
                <div class="budget-numbers">
                    <span class="spent">${this.formatCurrencyCompact(budget.spent)} spent</span>
                    <span class="limit">${this.formatCurrencyCompact(budget.limit)} limit</span>
                </div>
            </div>
        `).join('');
    }

    updateGoalsProgress() {
        const container = document.getElementById('goalsContainer');
        if (!container) {
            console.warn('⚠️ Goals container not found');
            return;
        }

        const goals = this.financialData.goalsProgress || [];
        console.log('🎯 Updating goals progress:', goals.length);

        if (goals.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-flag display-4 text-muted"></i>
                    <p class="mt-3 text-muted">No goals set</p>
                    <button class="btn btn-primary btn-sm" onclick="window.location.href='goals.html'">
                        Set a Goal
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = goals.slice(0, 2).map(goal => {
            const progress = goal.progress || 0;
            const daysRemaining = Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24));

            return `
            <div class="goal-item ${goal.completed ? 'completed' : ''}">
                <div class="goal-header">
                    <span class="goal-title">${this.escapeHtml(goal.title)}</span>
                    <span class="goal-priority ${goal.priority}">${goal.priority}</span>
                </div>
                <div class="progress goal-bar">
                    <div class="progress-bar ${progress >= 100 ? 'bg-success' : progress >= 75 ? 'bg-primary' : progress >= 50 ? 'bg-warning' : 'bg-danger'}" 
                         role="progressbar" 
                         style="width: ${progress}%"
                         aria-valuenow="${progress}" 
                         aria-valuemin="0" 
                         aria-valuemax="100">
                    </div>
                </div>
                <div class="goal-numbers">
                    <span>${this.formatCurrencyCompact(goal.currentAmount)}</span>
                    <span>of ${this.formatCurrencyCompact(goal.targetAmount)}</span>
                    <span>${progress.toFixed(1)}%</span>
                </div>
                ${daysRemaining > 0 ? `<div class="goal-deadline">${daysRemaining} days left</div>` : ''}
            </div>
        `}).join('');
    }

    // Lightweight local render for active loans used by dashboard (fast path)
    renderActiveLoansPanelLocal(loans) {
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

        // Keep dashboard panel compact — show up to 3 loans
        panel.innerHTML = loans.slice(0, 3).map(loan => {
            const progress = loan.metrics?.progress || 
                (loan.amount > 0 ? (((loan.payments || []).reduce((s, p) => s + (p.principal || 0), 0) / loan.amount) * 100) : 0);
            
            return `
            <div class="loan-item">
                <div class="loan-meta">
                    <div class="loan-title">${this.escapeHtml(loan.name || loan.title || 'Loan')}</div>
                    <div class="loan-sub">Remaining: ${this.formatCurrency(loan.remainingBalance || loan.amount || 0)}</div>
                </div>
                <div class="loan-progress">
                    <div class="progress progress-small">
                        <div class="progress-bar bg-primary" role="progressbar" style="width: ${Math.min(100, progress)}%"></div>
                    </div>
                    <div class="progress-text-small">${progress.toFixed(1)}%</div>
                </div>
            </div>
        `}).join('');
    }

    updateQuickStats() {
        const data = this.financialData;
        const analytics = data.analytics || {};

        console.log('📈 Updating quick stats...');

        // Today's transactions
        const todayTransactionCount = document.getElementById('todayTransactionCount');
        if (todayTransactionCount) {
            const today = new Date().toDateString();
            const todayTransactions = data.recentTransactions ?
                data.recentTransactions.filter(t => new Date(t.date).toDateString() === today) : [];
            todayTransactionCount.textContent = todayTransactions.length;
        }

        // Budget categories
        const budgetCategoriesCount = document.getElementById('budgetCategoriesCount');
        if (budgetCategoriesCount) {
            budgetCategoriesCount.textContent = data.budgetStatus ? data.budgetStatus.length : 0;
        }

        // Active goals
        const activeGoalsCount = document.getElementById('activeGoalsCount');
        if (activeGoalsCount) {
            activeGoalsCount.textContent = data.goalsProgress ?
                data.goalsProgress.filter(goal => !goal.completed).length : 0;
        }

        // Savings rate
        const savingsRate = document.getElementById('savingsRate');
        if (savingsRate && data.monthlyIncome > 0) {
            const rate = ((data.monthlySavings / data.monthlyIncome) * 100).toFixed(1);
            savingsRate.textContent = `${rate}%`;
        }
    }

    generateQuickInsights() {
        const container = document.getElementById('insightsContainer');
        if (!container) {
            console.warn('⚠️ Insights container not found');
            return;
        }

        const data = this.financialData;
        const insights = [];

        console.log('💡 Generating quick insights...');

        // Savings insight
        if (data.monthlySavings > 0) {
            const savingsRate = ((data.monthlySavings / data.monthlyIncome) * 100).toFixed(1);
            if (savingsRate >= 20) {
                insights.push({
                    type: 'success',
                    icon: 'bi-piggy-bank',
                    title: 'Great Savings Rate!',
                    message: `You're saving ${savingsRate}% of your income. Keep it up!`
                });
            } else if (savingsRate < 10) {
                insights.push({
                    type: 'warning',
                    icon: 'bi-exclamation-triangle',
                    title: 'Low Savings Rate',
                    message: `Consider increasing your savings (currently ${savingsRate}%)`
                });
            }
        }

        // Budget insights
        if (data.budgetStatus) {
            const exceededBudgets = data.budgetStatus.filter(b => b.status === 'exceeded');
            if (exceededBudgets.length > 0) {
                insights.push({
                    type: 'danger',
                    icon: 'bi-exclamation-circle',
                    title: 'Budget Alert',
                    message: `${exceededBudgets.length} budget${exceededBudgets.length > 1 ? 's' : ''} exceeded limit`
                });
            }
        }

        // Default insight
        if (insights.length === 0) {
            insights.push({
                type: 'info',
                icon: 'bi-info-circle',
                title: 'Welcome to FinTrack!',
                message: 'Start by adding transactions and setting up budgets to get personalized insights.'
            });
        }

        container.innerHTML = insights.map(insight => `
            <div class="insight-item insight-${insight.type}">
                <div class="insight-icon">
                    <i class="bi ${insight.icon}"></i>
                </div>
                <div class="insight-content">
                    <h5>${insight.title}</h5>
                    <p>${insight.message}</p>
                </div>
            </div>
        `).join('');
    }

    getProgressBarClass(percentage) {
        if (percentage >= 100) return 'bg-danger';
        if (percentage >= 80) return 'bg-warning';
        return 'bg-success';
    }

    showLoadingState() {
        console.log('⏳ Showing loading state...');
        const sections = ['recentTransactions', 'budgetProgress', 'goalsContainer', 'insightsContainer'];
        sections.forEach(section => {
            const element = document.getElementById(section);
            if (element) {
                element.innerHTML = `
                    <div class="text-center py-4">
                        <div class="spinner"></div>
                        <p class="mt-3 text-muted">Loading...</p>
                    </div>
                `;
            }
        });
    }

    hideLoadingState() {
        console.log('✅ Hiding loading state...');
        // Loading states are replaced by actual content
    }

    showPartialErrorState(error) {
        console.warn('⚠️ Partial error state:', error);
        // Don't show full error, just log it
        // The UI will show cached data or empty states
    }

    showErrorState(error) {
        console.error('❌ Showing error state:', error);
        const container = document.getElementById('dashboardContent');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger">
                    <h4>Error Loading Dashboard</h4>
                    <p>${error.message || 'Failed to load dashboard data'}</p>
                    <div class="mt-3">
                        <button class="btn btn-primary me-2" onclick="window.dashboard.loadDashboardData()">
                            Try Again
                        </button>
                        <button class="btn btn-outline-secondary" onclick="window.location.reload()">
                            Reload Page
                        </button>
                    </div>
                </div>
            `;
        }
    }

    // Utility methods
    formatCurrency(amount) {
        try {
            const num = (typeof amount === 'number') ? amount : Number(amount) || 0;
            return (window.AuthUtils && AuthUtils.formatCurrency) ? AuthUtils.formatCurrency(num, 'INR') : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(num);
        } catch (e) {
            console.error('formatCurrency error:', e);
            return '₹0';
        }
    }

    formatCurrencyCompact(amount) {
        try {
            const num = (typeof amount === 'number') ? amount : Number(amount) || 0;
            return (window.AuthUtils && AuthUtils.formatNumber) ? AuthUtils.formatNumber(num) : num.toLocaleString();
        } catch (e) {
            console.error('formatCurrencyCompact error:', e);
            return '₹0';
        }
    }

    formatDate(dateString) {
        try {
            if (!dateString) return '';
            const d = new Date(dateString);
            if (isNaN(d)) return '';
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } catch (e) {
            console.error('formatDate error:', e);
            return '';
        }
    }

    escapeHtml(unsafe) {
        try {
            if (unsafe === null || unsafe === undefined) return '';
            const s = String(unsafe);
            return s
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/\"/g, "&quot;")
                .replace(/'/g, "&#039;");
        } catch (e) {
            console.error('escapeHtml error:', e);
            return '';
        }
    }

    async addTransaction() {
        try {
            console.log('➕ Adding new transaction...');
            const type = document.querySelector('input[name="type"]:checked')?.value;
            const amount = parseFloat(document.getElementById('amount')?.value);
            const category = document.getElementById('category')?.value;
            const description = document.getElementById('description')?.value;
            const date = document.getElementById('transactionDate')?.value;

            if (!type || !amount || !category || !description) {
                AuthUtils.showMessage('Please fill in all fields', 'error');
                return;
            }

            if (amount <= 0) {
                AuthUtils.showMessage('Amount must be greater than 0', 'error');
                return;
            }

            const transactionData = {
                type,
                amount,
                category,
                description,
                date: date || new Date().toISOString().split('T')[0]
            };

            console.log('📤 Sending transaction data:', transactionData);
            const response = await AuthUtils.apiCall('/transactions', {
                method: 'POST',
                body: transactionData
            });

            if (response.success) {
                const modal = bootstrap.Modal.getInstance(document.getElementById('addTransactionModal'));
                if (modal) {
                    modal.hide();
                }

                AuthUtils.showMessage('Transaction added successfully!', 'success');
                this.loadDashboardData();

                // Trigger event for other components
                document.dispatchEvent(new CustomEvent('transactionUpdated'));
                localStorage.setItem('fintrack_transactions_updated', Date.now().toString());

                // Reset form
                const form = document.getElementById('addTransactionForm');
                if (form) {
                    form.reset();
                }
            }

        } catch (error) {
            console.error('❌ Add transaction error:', error);
            AuthUtils.showMessage(error.message || 'Failed to add transaction', 'error');
        }
    }
}

// Global functions
function showAddTransactionModal() {
    const modal = new bootstrap.Modal(document.getElementById('addTransactionModal'));
    modal.show();
}

function addTransaction() {
    if (window.dashboard) {
        window.dashboard.addTransaction();
    }
}

function viewTransactionDetails(transactionId) {
    window.location.href = `transactions.html#transaction-${transactionId}`;
}

// Debug function to test API manually
function testDashboardAPI() {
    console.group('🧪 Dashboard API Test');
    if (window.AuthUtils) {
        AuthUtils.debugAuthStatus();

        const token = AuthUtils.getToken();
        if (token) {
            fetch('http://localhost:3001/api/financial/overview', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })
                .then(response => {
                    console.log('Response status:', response.status);
                    return response.json();
                })
                .then(data => console.log('API Response:', data))
                .catch(error => console.error('API Error:', error));
        }
    }
    console.groupEnd();
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing Dashboard...');
    window.dashboard = new Dashboard();

    // Add debug function to global scope
    window.testDashboardAPI = testDashboardAPI;
});