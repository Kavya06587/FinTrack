class BudgetCalculator {
    constructor() {
        this.chart = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadUserData();
        this.calculateBudget();
    }

    setupEventListeners() {
        // Income slider and input sync
        this.syncInputAndSlider(
            document.getElementById('monthly-income'),
            document.getElementById('monthly-income-slider'),
            document.getElementById('monthly-income-value'),
            true
        );

        // Expense inputs
        const expenseInputs = [
            'housing-expense', 'food-expense', 'transportation-expense',
            'entertainment-expense', 'savings-expense', 'other-expense'
        ];

        expenseInputs.forEach(id => {
            document.getElementById(id).addEventListener('input', () => {
                this.calculateBudget();
            });
        });

        // Calculate button
        document.getElementById('calculate-budget').addEventListener('click', () => {
            this.calculateBudget();
        });

        // Save budget button
        document.getElementById('save-budget').addEventListener('click', () => {
            this.saveBudget();
        });

        // Export button
        document.getElementById('export-report').addEventListener('click', () => {
            this.exportReport();
        });
    }

    syncInputAndSlider(input, slider, display, isCurrency = false) {
        input.addEventListener('input', function () {
            slider.value = this.value;
            updateDisplay();
        });

        slider.addEventListener('input', function () {
            input.value = this.value;
            updateDisplay();
        });

        const updateDisplay = () => {
            if (isCurrency) {
                display.textContent = this.formatCurrency(parseFloat(input.value));
            }
        };

        updateDisplay();
    }

    loadUserData() {
        // Try to load user's actual data from the system
        const user = window.AuthUtils ? window.AuthUtils.getUser() : null;
        if (user && user.monthlyIncome) {
            const incomeInput = document.getElementById('monthly-income');
            const incomeSlider = document.getElementById('monthly-income-slider');

            incomeInput.value = user.monthlyIncome;
            incomeSlider.value = user.monthlyIncome;
            this.updateDisplayValue('monthly-income-value', user.monthlyIncome, true);
        }
    }

    calculateBudget() {
        const monthlyIncome = parseFloat(document.getElementById('monthly-income').value);

        // Get all expense values
        const expenses = {
            housing: parseFloat(document.getElementById('housing-expense').value) || 0,
            food: parseFloat(document.getElementById('food-expense').value) || 0,
            transportation: parseFloat(document.getElementById('transportation-expense').value) || 0,
            entertainment: parseFloat(document.getElementById('entertainment-expense').value) || 0,
            savings: parseFloat(document.getElementById('savings-expense').value) || 0,
            other: parseFloat(document.getElementById('other-expense').value) || 0
        };

        // Calculate totals
        const totalExpenses = Object.values(expenses).reduce((sum, expense) => sum + expense, 0);
        const remainingBalance = monthlyIncome - totalExpenses;

        // Update summary
        this.updateDisplayValue('total-income', monthlyIncome, true);
        this.updateDisplayValue('total-expenses', totalExpenses, true);
        this.updateDisplayValue('remaining-balance', remainingBalance, true);

        // Update chart
        this.updateChart(expenses, monthlyIncome);

        // Generate recommendations
        this.generateRecommendations(expenses, monthlyIncome);

        // Update breakdown table
        this.updateBreakdownTable(expenses, monthlyIncome);
    }

    updateChart(expenses, monthlyIncome) {
        const ctx = document.getElementById('budget-chart').getContext('2d');

        // Destroy existing chart if it exists
        if (this.chart) {
            this.chart.destroy();
        }

        const categories = {
            'Housing': expenses.housing,
            'Food': expenses.food,
            'Transportation': expenses.transportation,
            'Entertainment': expenses.entertainment,
            'Savings': expenses.savings,
            'Other': expenses.other,
            'Remaining': monthlyIncome - Object.values(expenses).reduce((sum, expense) => sum + expense, 0)
        };

        // Filter out zero values for better visualization
        const labels = Object.keys(categories).filter(label => categories[label] > 0);
        const data = labels.map(label => categories[label]);
        const backgroundColors = [
            '#4361ee', '#4cc9f0', '#7209b7',
            '#f72585', '#4ade80', '#f59e0b', '#6b7280'
        ].slice(0, labels.length);

        this.chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColors,
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
                            color: 'white',
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const percentage = ((value / monthlyIncome) * 100).toFixed(1);
                                return `${label}: ${this.formatCurrency(value)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    generateRecommendations(expenses, monthlyIncome) {
        const recommendations = [];
        const recommendationsList = document.getElementById('recommendations-list');

        // Standard budget recommendations (percentage of income)
        const standardBudgets = {
            housing: { min: 0.25, max: 0.35, name: 'Housing' },
            food: { min: 0.10, max: 0.15, name: 'Food' },
            transportation: { min: 0.10, max: 0.15, name: 'Transportation' },
            entertainment: { min: 0.05, max: 0.10, name: 'Entertainment' },
            savings: { min: 0.15, max: 0.20, name: 'Savings' }
        };

        // Check each category
        Object.keys(standardBudgets).forEach(category => {
            const spent = expenses[category];
            const percentage = monthlyIncome > 0 ? (spent / monthlyIncome) : 0;
            const standard = standardBudgets[category];

            if (percentage < standard.min) {
                const recommended = monthlyIncome * standard.min;
                recommendations.push({
                    type: 'warning',
                    message: `Consider increasing ${standard.name} to ${this.formatCurrency(recommended)} for better financial stability.`
                });
            } else if (percentage > standard.max) {
                const recommended = monthlyIncome * standard.max;
                recommendations.push({
                    type: 'warning',
                    message: `Your ${standard.name} spending is high. Try to reduce it to ${this.formatCurrency(recommended)}.`
                });
            }
        });

        // Check savings rate
        const savingsRate = monthlyIncome > 0 ? (expenses.savings / monthlyIncome) : 0;
        if (savingsRate >= 0.15) {
            recommendations.push({
                type: 'positive',
                message: 'Great job! Your savings rate is excellent. Keep building your financial future.'
            });
        } else if (savingsRate < 0.10) {
            recommendations.push({
                type: 'warning',
                message: 'Try to increase your savings rate to at least 15% for better financial security.'
            });
        }

        // Check if spending exceeds income
        const totalSpent = Object.values(expenses).reduce((sum, expense) => sum + expense, 0);
        if (totalSpent > monthlyIncome) {
            recommendations.unshift({
                type: 'danger',
                message: 'Warning: Your expenses exceed your income! Consider reducing spending or increasing income.'
            });
        }

        // Update recommendations list
        recommendationsList.innerHTML = recommendations.map(rec => `
            <div class="recommendation ${rec.type}">
                <i class="bi ${rec.type === 'positive' ? 'bi-check-circle' : rec.type === 'danger' ? 'bi-exclamation-circle' : 'bi-exclamation-triangle'}"></i>
                <span>${rec.message}</span>
            </div>
        `).join('');
    }

    updateBreakdownTable(expenses, monthlyIncome) {
        const breakdownBody = document.getElementById('breakdown-body');

        const categories = {
            housing: { name: 'Housing & Rent', recommended: 0.30 },
            food: { name: 'Food & Dining', recommended: 0.125 },
            transportation: { name: 'Transportation', recommended: 0.125 },
            entertainment: { name: 'Entertainment', recommended: 0.075 },
            savings: { name: 'Savings & Investments', recommended: 0.175 },
            other: { name: 'Other Expenses', recommended: 0.10 }
        };

        const rows = Object.keys(categories).map(category => {
            const spent = expenses[category];
            const percentage = monthlyIncome > 0 ? (spent / monthlyIncome) : 0;
            const recommendedAmount = monthlyIncome * categories[category].recommended;
            const difference = spent - recommendedAmount;
            const status = this.getStatus(percentage, categories[category].recommended);

            return `
                <tr>
                    <td>${categories[category].name}</td>
                    <td>${this.formatCurrency(spent)} (${(percentage * 100).toFixed(1)}%)</td>
                    <td>${(categories[category].recommended * 100).toFixed(1)}%</td>
                    <td>${this.formatCurrency(recommendedAmount)}</td>
                    <td class="status-${status}">${this.getStatusText(status)}</td>
                    <td class="${difference >= 0 ? 'difference-negative' : 'difference-positive'}">
                        ${difference >= 0 ? '+' : ''}${this.formatCurrency(difference)}
                    </td>
                </tr>
            `;
        });

        breakdownBody.innerHTML = rows.join('');
    }

    getStatus(actualPercentage, recommendedPercentage) {
        const tolerance = 0.05; // 5% tolerance
        if (actualPercentage <= recommendedPercentage + tolerance &&
            actualPercentage >= recommendedPercentage - tolerance) {
            return 'good';
        } else if (actualPercentage > recommendedPercentage + tolerance) {
            return 'warning';
        } else {
            return 'danger';
        }
    }

    getStatusText(status) {
        switch (status) {
            case 'good': return 'On Track';
            case 'warning': return 'Over Budget';
            case 'danger': return 'Under Budget';
            default: return 'Needs Attention';
        }
    }

    // In budget-calculator.js - Enhanced saveBudget method
    async saveBudget() {
        try {
            const monthlyIncome = parseFloat(document.getElementById('monthly-income').value);
            const expenses = {
                'Housing & Rent': parseFloat(document.getElementById('housing-expense').value) || 0,
                'Food & Dining': parseFloat(document.getElementById('food-expense').value) || 0,
                'Transportation': parseFloat(document.getElementById('transportation-expense').value) || 0,
                'Entertainment': parseFloat(document.getElementById('entertainment-expense').value) || 0,
                'Savings & Investments': parseFloat(document.getElementById('savings-expense').value) || 0,
                'Other Expenses': parseFloat(document.getElementById('other-expense').value) || 0
            };

            // Map displayed category names to canonical category strings used by transactions/budgets
            const categoryMap = {
                'Housing & Rent': 'Rent',
                'Food & Dining': 'Food & Dining',
                'Transportation': 'Transportation',
                'Entertainment': 'Entertainment',
                'Savings & Investments': 'Investments',
                'Other Expenses': 'Other'
            };

            // Create budgets for each category with significant spending
            const budgetPromises = Object.entries(expenses)
                .filter(([category, amount]) => amount > 0)
                .map(async ([category, amount]) => {
                    const canonicalCategory = categoryMap[category] || category;
                    const budgetData = {
                        category: canonicalCategory,
                        limit: amount,
                        period: 'monthly',
                        description: `Budget calculated from planner`,
                        alerts: true,
                        alertThreshold: 80
                    };

                    try {
                        const response = await this.apiCall('/budgets', {
                            method: 'POST',
                            body: budgetData
                        });
                        return response.success;
                    } catch (error) {
                        console.error(`Failed to create budget for ${canonicalCategory}:`, error);
                        return false;
                    }
                });

            const results = await Promise.all(budgetPromises);
            const successCount = results.filter(success => success).length;

            if (successCount > 0) {
                this.showMessage(`${successCount} budgets created successfully! You'll see them on your dashboard.`, 'success');

                // Refresh dashboard after a short delay
                setTimeout(() => {
                    if (window.budgetManager) {
                        window.budgetManager.refreshDashboard();
                    }

                    // Redirect to dashboard after successful creation
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 2000);
                }, 1000);
            } else {
                this.showMessage('No budgets were created. Please try again.', 'error');
            }

        } catch (error) {
            console.error('Error saving budget:', error);
            this.showMessage('Failed to save budgets: ' + error.message, 'error');
        }
    }

    exportReport() {
        // Create a simple text report
        const monthlyIncome = parseFloat(document.getElementById('monthly-income').value);
        const totalExpenses = parseFloat(document.getElementById('total-expenses').textContent.replace(/[^0-9.-]+/g, ""));
        const remainingBalance = parseFloat(document.getElementById('remaining-balance').textContent.replace(/[^0-9.-]+/g, ""));

        const report = `
FinTrack Budget Report
Generated on: ${new Date().toLocaleDateString()}

INCOME:
Monthly Income: ${this.formatCurrency(monthlyIncome)}

EXPENSES:
Housing & Rent: ${this.formatCurrency(parseFloat(document.getElementById('housing-expense').value))}
Food & Dining: ${this.formatCurrency(parseFloat(document.getElementById('food-expense').value))}
Transportation: ${this.formatCurrency(parseFloat(document.getElementById('transportation-expense').value))}
Entertainment: ${this.formatCurrency(parseFloat(document.getElementById('entertainment-expense').value))}
Savings & Investments: ${this.formatCurrency(parseFloat(document.getElementById('savings-expense').value))}
Other Expenses: ${this.formatCurrency(parseFloat(document.getElementById('other-expense').value))}

SUMMARY:
Total Expenses: ${this.formatCurrency(totalExpenses)}
Remaining Balance: ${this.formatCurrency(remainingBalance)}
Savings Rate: ${((parseFloat(document.getElementById('savings-expense').value) / monthlyIncome) * 100).toFixed(1)}%

This report was generated by FinTrack Budget Calculator.
        `.trim();

        // Create and download the file
        const blob = new Blob([report], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fintrack-budget-report-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        if (window.AuthUtils && window.AuthUtils.showMessage) {
            window.AuthUtils.showMessage('Budget report exported successfully!', 'success');
        }
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    updateDisplayValue(elementId, value, isCurrency = false) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = isCurrency ? this.formatCurrency(value) : value;
        }
    }

    // Small API helper consistent with other modules
    async apiCall(endpoint, options = {}) {
        if (window.AuthUtils && window.AuthUtils.apiCall) {
            return await window.AuthUtils.apiCall(endpoint, options);
        } else {
            const token = localStorage.getItem('fintrack_token');
            const response = await fetch(`http://localhost:3001/api${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                },
                ...options,
                body: options.body ? JSON.stringify(options.body) : undefined
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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.budgetCalculator = new BudgetCalculator();
});