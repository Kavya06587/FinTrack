// Dashboard functionality
class Dashboard {
    constructor() {
        this.user = null;
        this.init();
    }

    init() {
        this.checkAuthentication();
        this.loadUserData();
        this.setupEventListeners();
        this.updateDashboard();
    }

    checkAuthentication() {
        const user = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        
        if (!user || !token) {
            window.location.href = 'login.html';
            return;
        }
        
        this.user = JSON.parse(user);
    }

    loadUserData() {
        if (!this.user) return;

        // Update welcome message and user info
        document.getElementById('welcomeMessage').textContent = 
            `Welcome back, ${this.user.firstName}!`;
        document.getElementById('userName').textContent = 
            `${this.user.firstName} ${this.user.lastName}`;
        document.getElementById('userEmail').textContent = this.user.email;
        document.getElementById('footerUserName').textContent = this.user.firstName;

        // Update financial data
        this.updateFinancialData();
        this.updateGoals();
        this.updateDate();
    }

    updateFinancialData() {
        // Format and display monthly income
        const monthlyIncome = this.user.monthlyIncome || 0;
        document.getElementById('monthlyIncome').textContent = 
            this.formatCurrency(monthlyIncome);

        // Calculate and display other financial metrics
        const expenses = monthlyIncome * 0.6; // Example calculation
        const savings = monthlyIncome * 0.2; // Example calculation
        
        document.getElementById('monthlyExpenses').textContent = 
            this.formatCurrency(expenses);
        document.getElementById('monthlySavings').textContent = 
            this.formatCurrency(savings);
    }

    updateGoals() {
        const goalsContainer = document.getElementById('goalsContainer');
        const goalsCount = document.getElementById('goalsCount');
        
        if (!this.user.financialGoals || this.user.financialGoals.length === 0) {
            goalsContainer.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-flag display-4 text-muted mb-3"></i>
                    <p class="text-muted">No financial goals set yet.</p>
                    <button class="btn btn-primary">Set Your First Goal</button>
                </div>
            `;
            goalsCount.textContent = '0';
            return;
        }

        goalsCount.textContent = this.user.financialGoals.length.toString();
        
        const goalsHTML = this.user.financialGoals.map((goal, index) => `
            <div class="goal-item">
                <div class="goal-header">
                    <h6 class="goal-title">${goal}</h6>
                    <span class="goal-date">Started: ${new Date().toLocaleDateString()}</span>
                </div>
                <div class="goal-progress">
                    <div class="progress">
                        <div class="progress-bar" style="width: ${(index + 1) * 25}%"></div>
                    </div>
                    <small class="text-muted">${(index + 1) * 25}% complete</small>
                </div>
            </div>
        `).join('');

        goalsContainer.innerHTML = goalsHTML;
    }

    updateDate() {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('dashboardDate').textContent = 
            `Today is ${now.toLocaleDateString('en-US', options)}`;
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    setupEventListeners() {
        // Add any dashboard-specific event listeners here
    }

    // Quick Actions Handler
    quickAction(action) {
        switch(action) {
            case 'add-expense':
                alert('Redirecting to Add Expense page...');
                break;
            case 'set-budget':
                alert('Redirecting to Budget Settings...');
                break;
            case 'view-reports':
                alert('Redirecting to Reports...');
                break;
            case 'savings-plan':
                alert('Redirecting to Savings Plan...');
                break;
            default:
                console.log('Unknown action:', action);
        }
    }
}

// Global function for quick actions
function quickAction(action) {
    if (window.dashboard) {
        window.dashboard.quickAction(action);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.dashboard = new Dashboard();
});

// Add some sample data for demonstration
function addSampleData() {
    // This would typically come from your backend API
    const sampleActivities = [
        {
            icon: 'bi-credit-card',
            type: 'expense',
            title: 'Grocery Shopping',
            amount: -85.50,
            time: '2 hours ago'
        },
        {
            icon: 'bi-bank',
            type: 'income',
            title: 'Salary Deposit',
            amount: 2500.00,
            time: '1 day ago'
        },
        {
            icon: 'bi-piggy-bank',
            type: 'savings',
            title: 'Automatic Savings',
            amount: -200.00,
            time: '3 days ago'
        }
    ];

    // You can extend this to populate more sample data
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Dashboard;
}