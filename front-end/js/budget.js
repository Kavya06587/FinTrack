class BudgetManager {
    constructor() {
        this.currentBudgets = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadBudgets();
    }

    setupEventListeners() {
        // Modal events
        const createBudgetModal = document.getElementById('createBudgetModal');
        if (createBudgetModal) {
            createBudgetModal.addEventListener('shown.bs.modal', () => {
                this.setupCreateBudgetForm();
            });
        }
    }

    async loadBudgets() {
        try {
            this.showLoadingState();
            
            // Load budgets from API
            const response = await this.apiCall('/budgets');
            if (response.success) {
                this.currentBudgets = response.budgets;
                this.renderBudgets();
            } else {
                this.showEmptyState();
            }
        } catch (error) {
            console.error('Error loading budgets:', error);
            this.showEmptyState();
        }
    }

    renderBudgets() {
        const container = document.getElementById('budgets-overview');
        
        if (!this.currentBudgets || this.currentBudgets.length === 0) {
            this.showEmptyState();
            return;
        }

        const budgetsHTML = this.currentBudgets.map(budget => this.createBudgetCard(budget)).join('');
        
        container.innerHTML = `
            <div class="budget-cards">
                ${budgetsHTML}
            </div>
        `;
    }

    createBudgetCard(budget) {
        const percentage = (budget.spent / budget.limit) * 100;
        const progressClass = this.getProgressClass(percentage);
        const remaining = budget.limit - budget.spent;
        
        return `
            <div class="budget-card">
                <div class="budget-header">
                    <div class="budget-category">${budget.category}</div>
                    <div class="budget-actions">
                        <button class="btn-icon" onclick="editBudget('${budget._id}')" title="Edit Budget">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn-icon" onclick="deleteBudget('${budget._id}')" title="Delete Budget">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
                
                <div class="budget-amounts">
                    <div class="budget-limit">${this.formatCurrency(budget.limit)}</div>
                    <div class="budget-spent">Spent: ${this.formatCurrency(budget.spent)}</div>
                </div>
                
                <div class="budget-progress">
                    <div class="progress">
                        <div class="progress-bar ${progressClass}" 
                             style="width: ${Math.min(percentage, 100)}%">
                        </div>
                    </div>
                </div>
                
                <div class="budget-status">
                    <div class="budget-percentage">${percentage.toFixed(1)}%</div>
                    <div class="budget-remaining">${this.formatCurrency(remaining)} remaining</div>
                </div>
            </div>
        `;
    }

    getProgressClass(percentage) {
        if (percentage <= 70) return 'progress-good';
        if (percentage <= 90) return 'progress-warning';
        return 'progress-danger';
    }

    showLoadingState() {
        const container = document.getElementById('budgets-overview');
        container.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Loading your budgets...</p>
            </div>
        `;
    }

    showEmptyState() {
        const container = document.getElementById('budgets-overview');
        container.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-wallet2"></i>
                <h3>No Budgets Yet</h3>
                <p>Create your first budget to start tracking your spending</p>
                <button class="btn btn-primary mt-3" onclick="showCreateBudgetModal()">
                    <i class="bi bi-plus-circle me-2"></i>Create First Budget
                </button>
            </div>
        `;
    }

    setupCreateBudgetForm() {
        // Reset form
        document.getElementById('createBudgetForm').reset();
        document.getElementById('budgetAlerts').checked = true;
    }

    async createBudget() {
        try {
            const rawCategory = document.getElementById('budgetCategory').value;
            // Normalize category: trim and use exact option value
            const category = rawCategory ? rawCategory.toString().trim() : '';

            const formData = {
                category,
                limit: parseFloat(document.getElementById('budgetLimit').value),
                period: document.getElementById('budgetPeriod').value,
                description: document.getElementById('budgetDescription').value,
                alerts: document.getElementById('budgetAlerts').checked
            };

            // Validation
            if (!formData.category || !formData.limit) {
                this.showMessage('Please fill in all required fields', 'error');
                return;
            }

            const response = await this.apiCall('/budgets', {
                method: 'POST',
                body: formData
            });

            if (response.success) {
                this.showMessage('Budget created successfully!', 'success');
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('createBudgetModal'));
                modal.hide();
                
                // Reload budgets
                await this.loadBudgets();
                
                // Refresh dashboard if we're on dashboard page
                this.refreshDashboard();
            }
        } catch (error) {
            console.error('Error creating budget:', error);
            this.showMessage(error.message || 'Failed to create budget', 'error');
        }
    }

    async deleteBudget(budgetId) {
        if (!confirm('Are you sure you want to delete this budget?')) {
            return;
        }

        try {
            const response = await this.apiCall(`/budgets/${budgetId}`, {
                method: 'DELETE'
            });

            if (response.success) {
                this.showMessage('Budget deleted successfully!', 'success');
                await this.loadBudgets();
                this.refreshDashboard();
            }
        } catch (error) {
            console.error('Error deleting budget:', error);
            this.showMessage(error.message || 'Failed to delete budget', 'error');
        }
    }

    refreshDashboard() {
        // If dashboard instance exists, refresh its data
        if (window.dashboard && typeof window.dashboard.loadDashboardData === 'function') {
            window.dashboard.loadDashboardData();
        }
        
        // Alternatively, you can trigger a custom event that dashboard listens to
        const event = new CustomEvent('budgetsUpdated');
        document.dispatchEvent(event);
    }

    // Utility methods
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    async apiCall(endpoint, options = {}) {
        if (window.AuthUtils && window.AuthUtils.apiCall) {
            return await window.AuthUtils.apiCall(endpoint, options);
        } else {
            // Fallback to direct fetch
            const token = localStorage.getItem('fintrack_token');
            const response = await fetch(`http://localhost:3001/api${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                ...options
            });
            return await response.json();
        }
    }

    showMessage(message, type = 'info') {
        if (window.AuthUtils && window.AuthUtils.showMessage) {
            window.AuthUtils.showMessage(message, type);
        } else {
            alert(message);
        }
    }
}

// Global functions for HTML onclick handlers
function showCreateBudgetModal() {
    const modal = new bootstrap.Modal(document.getElementById('createBudgetModal'));
    modal.show();
}

function showCurrentBudgets() {
    // This would typically show a detailed view
    window.budgetManager.loadBudgets();
}

function showBudgetCategories() {
    // Navigate to categories management
    window.location.href = 'budget-categories.html';
}

function showSpendingLimits() {
    // Navigate to spending limits management
    window.location.href = 'spending-limits.html';
}

function openBudgetCalculator() {
    // Navigate to budget calculator
    window.location.href = 'budget-calculator.html';
}

function createBudget() {
    window.budgetManager.createBudget();
}

function editBudget(budgetId) {
    // Implementation for editing budget
    window.budgetManager.showMessage('Edit budget feature coming soon!', 'info');
}

function deleteBudget(budgetId) {
    window.budgetManager.deleteBudget(budgetId);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.budgetManager = new BudgetManager();
});