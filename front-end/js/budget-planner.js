document.addEventListener('DOMContentLoaded', function() {
    const goals = [];
    let monthlyIncome = 0;
    let monthlyExpenses = 0;
    let currentSavings = 0;

    // Add goal functionality
    document.getElementById('add-goal').addEventListener('click', function() {
        const goalName = document.getElementById('goal-name').value.trim();
        const goalAmount = parseFloat(document.getElementById('goal-amount').value);
        const goalTimeline = parseInt(document.getElementById('goal-timeline').value);
        const goalPriority = document.getElementById('goal-priority').value;

        if (goalName && goalAmount > 0 && goalTimeline > 0) {
            goals.push({
                id: Date.now(),
                name: goalName,
                amount: goalAmount,
                timeline: goalTimeline,
                priority: goalPriority
            });

            // Clear form
            document.getElementById('goal-name').value = '';
            document.getElementById('goal-amount').value = '';
            document.getElementById('goal-timeline').value = '';

            updateGoalsPreview();
            showNotification('Goal added successfully!', 'success');
        } else {
            showNotification('Please fill in all goal fields with valid values.', 'error');
        }
    });

    // Calculate plan functionality
    document.getElementById('calculate-plan').addEventListener('click', function() {
        monthlyIncome = parseFloat(document.getElementById('monthly-income').value) || 0;
        monthlyExpenses = parseFloat(document.getElementById('monthly-expenses').value) || 0;
        currentSavings = parseFloat(document.getElementById('current-savings').value) || 0;

        if (monthlyIncome <= 0) {
            showNotification('Please enter your monthly income.', 'error');
            return;
        }

        if (goals.length === 0) {
            showNotification('Please add at least one financial goal.', 'error');
            return;
        }

        calculateBudgetPlan();
    });

    function updateGoalsPreview() {
        const goalsPreview = document.getElementById('goals-preview');
        goalsPreview.innerHTML = '';

        if (goals.length === 0) {
            goalsPreview.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-bullseye"></i>
                    <p>No goals added yet. Add your first financial goal above.</p>
                </div>
            `;
            return;
        }

        goals.forEach((goal) => {
            const goalItem = document.createElement('div');
            goalItem.className = 'goal-preview-item';
            goalItem.innerHTML = `
                <h5>${goal.name}</h5>
                <div class="goal-preview-meta">
                    <span>$${goal.amount.toFixed(2)} in ${goal.timeline} months</span>
                    <span class="priority priority-${goal.priority}">${goal.priority}</span>
                </div>
            `;
            goalsPreview.appendChild(goalItem);
        });
    }

    function calculateBudgetPlan() {
        const monthlySavings = monthlyIncome - monthlyExpenses;
        const availableForGoals = monthlySavings > 0 ? monthlySavings : 0;
        const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;

        // Update summary
        document.getElementById('summary-income').textContent = `$${monthlyIncome.toLocaleString()}`;
        document.getElementById('summary-expenses').textContent = `$${monthlyExpenses.toLocaleString()}`;
        document.getElementById('summary-savings').textContent = `$${monthlySavings.toLocaleString()}`;
        document.getElementById('summary-available').textContent = `$${availableForGoals.toLocaleString()}`;
        document.getElementById('savings-rate').textContent = `${savingsRate.toFixed(1)}%`;

        // Generate goals list
        const goalsList = document.getElementById('goals-list');
        goalsList.innerHTML = '';

        let totalMonthlyNeeded = 0;
        let highPriorityGoals = 0;

        goals.forEach(goal => {
            const monthlyNeeded = goal.amount / goal.timeline;
            totalMonthlyNeeded += monthlyNeeded;
            if (goal.priority === 'high') highPriorityGoals++;

            const feasible = monthlyNeeded <= availableForGoals;
            const monthsNeeded = availableForGoals > 0 ? Math.ceil(goal.amount / availableForGoals) : '∞';
            
            let feasibilityClass = 'feasible';
            let feasibilityText = `You can save $${monthlyNeeded.toFixed(2)}/month to reach your goal in ${goal.timeline} months`;

            if (!feasible) {
                feasibilityClass = availableForGoals > 0 ? 'challenging' : 'difficult';
                feasibilityText = availableForGoals > 0 
                    ? `With current savings, you'll need ${monthsNeeded} months (${goal.timeline} months goal)`
                    : `You need to increase income or reduce expenses to fund this goal`;
            }

            const goalItem = document.createElement('div');
            goalItem.className = 'goal-item';
            goalItem.innerHTML = `
                <div class="goal-info">
                    <h4>${goal.name}</h4>
                    <div>Target: $${goal.amount.toLocaleString()} in ${goal.timeline} months</div>
                    <div>Priority: <span class="priority-${goal.priority}">${goal.priority}</span></div>
                </div>
                <div class="goal-amount ${feasibilityClass}">
                    ${feasibilityText}
                </div>
            `;
            goalsList.appendChild(goalItem);
        });

        // Update savings text and generate action plan
        const savingsText = document.getElementById('savings-text');
        const actionSteps = document.getElementById('action-steps');
        actionSteps.innerHTML = '';

        if (monthlySavings > 0) {
            if (totalMonthlyNeeded <= availableForGoals) {
                savingsText.textContent = `Great! Your current savings rate can fund all your goals. You'll save $${monthlySavings.toLocaleString()} monthly.`;
                savingsText.className = 'feasible';
                
                actionSteps.innerHTML += `
                    <div class="action-step">
                        <i class="fas fa-check-circle"></i>
                        <div>
                            <strong>Maintain Current Strategy</strong>
                            <p>Continue saving $${monthlySavings.toLocaleString()} monthly to achieve all your goals on schedule.</p>
                        </div>
                    </div>
                `;
            } else {
                savingsText.textContent = `You can save $${monthlySavings.toLocaleString()} monthly, but need to prioritize your goals.`;
                savingsText.className = 'challenging';
                
                actionSteps.innerHTML += `
                    <div class="action-step">
                        <i class="fas fa-sort-amount-down"></i>
                        <div>
                            <strong>Prioritize High-Impact Goals</strong>
                            <p>Focus on your ${highPriorityGoals} high-priority goals first, then address medium and low priorities.</p>
                        </div>
                    </div>
                `;
            }
            
            if (savingsRate < 20) {
                actionSteps.innerHTML += `
                    <div class="action-step">
                        <i class="fas fa-chart-line"></i>
                        <div>
                            <strong>Increase Savings Rate</strong>
                            <p>Try to reach 20% savings rate ($${(monthlyIncome * 0.2).toLocaleString()}/month) for better financial health.</p>
                        </div>
                    </div>
                `;
            }
        } else {
            savingsText.textContent = `Your expenses exceed your income by $${Math.abs(monthlySavings).toLocaleString()}. Immediate action needed.`;
            savingsText.className = 'difficult';
            
            actionSteps.innerHTML += `
                <div class="action-step">
                    <i class="fas fa-search-dollar"></i>
                    <div>
                        <strong>Reduce Expenses</strong>
                        <p>Identify and cut unnecessary expenses to create positive cash flow.</p>
                    </div>
                </div>
                <div class="action-step">
                    <i class="fas fa-briefcase"></i>
                    <div>
                        <strong>Increase Income</strong>
                        <p>Consider additional income sources to cover the deficit.</p>
                    </div>
                </div>
                <div class="action-step">
                    <i class="fas fa-clock"></i>
                    <div>
                        <strong>Adjust Goal Timelines</strong>
                        <p>Extend your goal timelines to reduce monthly funding requirements.</p>
                    </div>
                </div>
            `;
        }

        // Show results
        document.getElementById('results').classList.remove('hidden');
        
        // Scroll to results
        document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
    }

    function showNotification(message, type) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show`;
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.zIndex = '9999';
        notification.style.minWidth = '300px';
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    // Initialize goals preview
    updateGoalsPreview();
});