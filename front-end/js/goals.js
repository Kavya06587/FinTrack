// goals.js - Complete fixed version
class GoalsManager {
    constructor() {
        this.goals = [];
        this.currentView = 'grid';
        this.retirementChart = null;
        this.progressChart = null;
        this.savingsChart = null;
        this.distributionChart = null;
        this.trendChart = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadGoals();
        this.setupRetirementCalculator();
        this.checkAuth();
    }

    checkAuth() {
        if (!window.AuthUtils || !AuthUtils.isAuthenticated()) {
            console.warn('User not authenticated, redirecting to login...');
            window.location.href = '../login.html';
            return false;
        }
        return true;
    }

    async apiCall(endpoint, options = {}) {
        if (!this.checkAuth()) return;
        
        try {
            return await AuthUtils.apiCall(endpoint, options);
        } catch (error) {
            console.error('API call failed:', error);
            AuthUtils.showMessage(error.message || 'Failed to fetch data', 'error');
            throw error;
        }
    }

    async loadGoals() {
        try {
            if (!this.checkAuth()) return;
            
            this.showLoadingState();
            
            const response = await this.apiCall('/goals');
            if (response.success) {
                this.goals = response.goals || [];
                this.updateStats();
                this.renderGoals();
                this.updateCharts();
            } else {
                this.showEmptyState();
            }
        } catch (error) {
            console.error('Error loading goals:', error);
            this.showEmptyState();
        }
    }

    updateStats() {
        const activeGoals = this.goals.filter(goal => !goal.completed).length;
        const completedGoals = this.goals.filter(goal => goal.completed).length;
        const totalSaved = this.goals.reduce((sum, goal) => sum + (goal.currentAmount || 0), 0);
        
        // Calculate upcoming deadlines (within 30 days)
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        const upcomingDeadlines = this.goals.filter(goal => {
            if (goal.completed) return false;
            const deadline = new Date(goal.deadline);
            return deadline <= thirtyDaysFromNow && deadline >= new Date();
        }).length;

        document.getElementById('active-goals').textContent = activeGoals;
        document.getElementById('completed-goals').textContent = completedGoals;
        document.getElementById('total-saved').textContent = this.formatCurrency(totalSaved);
        document.getElementById('upcoming-deadlines').textContent = upcomingDeadlines;
    }

    renderGoals() {
        this.renderGridView();
        this.renderListView();
        this.renderTimelineView();
    }

    renderGridView() {
        const container = document.getElementById('goals-grid-container');
        if (!container) return;

        if (this.goals.length === 0) {
            container.innerHTML = this.getEmptyStateHTML();
            return;
        }

        container.innerHTML = this.goals.map(goal => this.createGoalCardHTML(goal)).join('');
        this.attachGoalCardEventListeners();
    }

    createGoalCardHTML(goal) {
        const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
        const daysRemaining = Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24));
        const isBehind = daysRemaining < 30 && progress < 50;
        const isUrgent = daysRemaining < 7 && progress < 80;

        let statusClass = '';
        if (goal.completed) statusClass = 'completed';
        else if (isUrgent) statusClass = 'urgent';
        else if (isBehind) statusClass = 'behind';

        return `
            <div class="goal-card ${goal.category} ${statusClass}" data-goal-id="${goal._id}">
                <div class="goal-header">
                    <div class="goal-title">
                        <h3>${goal.title}</h3>
                        <span class="goal-category">${goal.category}</span>
                    </div>
                    <span class="goal-priority priority-${goal.priority}">${goal.priority}</span>
                </div>
                
                <div class="goal-progress">
                    <div class="progress-info">
                        <span class="progress-amount">
                            ${this.formatCurrency(goal.currentAmount)} / ${this.formatCurrency(goal.targetAmount)}
                        </span>
                        <span class="progress-percentage">${progress.toFixed(1)}%</span>
                    </div>
                    <div class="progress">
                        <div class="progress-bar" style="width: ${Math.min(progress, 100)}%"></div>
                    </div>
                </div>

                <div class="goal-details">
                    <div class="detail-item">
                        <div class="detail-label">Deadline</div>
                        <div class="detail-value">${this.formatDate(goal.deadline)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Days Left</div>
                        <div class="detail-value ${daysRemaining < 30 ? 'text-danger' : ''}">
                            ${daysRemaining}
                        </div>
                    </div>
                </div>

                <div class="goal-actions">
                    <button class="btn-goal-action btn-contribute" onclick="goalsManager.contributeToGoal('${goal._id}')">
                        <i class="bi bi-plus-circle"></i> Contribute
                    </button>
                    <button class="btn-goal-action btn-edit" onclick="goalsManager.editGoal('${goal._id}')">
                        <i class="bi bi-pencil"></i> Edit
                    </button>
                </div>
            </div>
        `;
    }

    renderListView() {
        const container = document.getElementById('goals-list-container');
        if (!container) return;

        if (this.goals.length === 0) {
            container.innerHTML = this.getEmptyStateHTML('list');
            return;
        }

        container.innerHTML = this.goals.map(goal => this.createGoalListItemHTML(goal)).join('');
    }

    createGoalListItemHTML(goal) {
        const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
        
        return `
            <div class="goal-list-item ${goal.category}" data-goal-id="${goal._id}">
                <div class="goal-list-icon" style="background: ${this.getCategoryColor(goal.category)}">
                    <i class="bi ${this.getCategoryIcon(goal.category)}"></i>
                </div>
                <div class="goal-list-content">
                    <div class="goal-list-header">
                        <div class="goal-list-title">
                            <h4>${goal.title}</h4>
                            <span class="goal-category">${goal.category} • ${this.formatDate(goal.deadline)}</span>
                        </div>
                        <span class="goal-priority priority-${goal.priority}">${goal.priority}</span>
                    </div>
                    <div class="goal-list-progress">
                        <div class="progress-info">
                            <span class="progress-amount">
                                ${this.formatCurrency(goal.currentAmount)} / ${this.formatCurrency(goal.targetAmount)}
                            </span>
                            <span class="progress-percentage">${progress.toFixed(1)}%</span>
                        </div>
                        <div class="progress">
                            <div class="progress-bar" style="width: ${Math.min(progress, 100)}%"></div>
                        </div>
                    </div>
                </div>
                <div class="goal-list-actions">
                    <button class="btn btn-sm btn-primary" onclick="goalsManager.contributeToGoal('${goal._id}')">
                        <i class="bi bi-plus-circle"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary" onclick="goalsManager.editGoal('${goal._id}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                </div>
            </div>
        `;
    }

    renderTimelineView() {
        const container = document.getElementById('goals-timeline-container');
        if (!container) return;

        if (this.goals.length === 0) {
            container.innerHTML = this.getEmptyStateHTML('timeline');
            return;
        }

        const sortedGoals = [...this.goals].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
        container.innerHTML = sortedGoals.map((goal, index) => this.createTimelineItemHTML(goal, index)).join('');
    }

    createTimelineItemHTML(goal, index) {
        const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
        const isEven = index % 2 === 0;
        
        return `
            <div class="timeline-item ${isEven ? 'left' : 'right'}">
                <div class="timeline-content ${goal.category}">
                    <div class="timeline-date">${this.formatDate(goal.deadline)}</div>
                    <h4>${goal.title}</h4>
                    <div class="goal-progress">
                        <div class="progress">
                            <div class="progress-bar" style="width: ${Math.min(progress, 100)}%"></div>
                        </div>
                        <div class="progress-info">
                            <span>${progress.toFixed(1)}% • ${this.formatCurrency(goal.currentAmount)}</span>
                        </div>
                    </div>
                    <div class="goal-actions">
                        <button class="btn btn-sm btn-primary" onclick="goalsManager.contributeToGoal('${goal._id}')">
                            Contribute
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    getEmptyStateHTML(viewType = 'grid') {
        const icons = {
            grid: 'bi-grid-3x3-gap',
            list: 'bi-list-task',
            timeline: 'bi-calendar-range'
        };
        
        return `
            <div class="empty-state">
                <i class="bi ${icons[viewType]} display-4 text-muted"></i>
                <h3>No Goals Yet</h3>
                <p class="text-muted">Start by creating your first financial goal to track your progress.</p>
                <button class="btn btn-primary mt-3" onclick="showCreateGoalModal()">
                    <i class="bi bi-plus-circle me-2"></i>Create Your First Goal
                </button>
            </div>
        `;
    }

    showLoadingState() {
        const containers = ['goals-grid-container', 'goals-list-container', 'goals-timeline-container'];
        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = `
                    <div class="loading-state">
                        <div class="spinner"></div>
                        <p>Loading your goals...</p>
                    </div>
                `;
            }
        });
    }

    showEmptyState() {
        const containers = ['goals-grid-container', 'goals-list-container', 'goals-timeline-container'];
        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = this.getEmptyStateHTML();
            }
        });
    }

    attachGoalCardEventListeners() {
        document.querySelectorAll('.goal-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.btn-goal-action')) {
                    const goalId = card.dataset.goalId;
                    this.viewGoalDetails(goalId);
                }
            });
        });
    }

    viewGoalDetails(goalId) {
        console.log('View goal details:', goalId);
        AuthUtils.showMessage('Goal details view coming soon!', 'info');
    }

    editGoal(goalId) {
        console.log('Edit goal:', goalId);
        AuthUtils.showMessage('Edit goal functionality coming soon!', 'info');
    }

    async contributeToGoal(goalId) {
        try {
            const amount = prompt('Enter contribution amount:');
            if (!amount || parseFloat(amount) <= 0) {
                AuthUtils.showMessage('Please enter a valid amount', 'error');
                return;
            }

            const response = await this.apiCall(`/goals/${goalId}/contribute`, {
                method: 'POST',
                body: { amount: parseFloat(amount) }
            });

            if (response.success) {
                AuthUtils.showMessage('Contribution added successfully!', 'success');
                await this.loadGoals();
                this.triggerDashboardUpdate();
            }
        } catch (error) {
            console.error('Error contributing to goal:', error);
            AuthUtils.showMessage(error.message || 'Failed to add contribution', 'error');
        }
    }

    setupEventListeners() {
        const createGoalModal = document.getElementById('createGoalModal');
        if (createGoalModal) {
            createGoalModal.addEventListener('shown.bs.modal', () => {
                this.setupCreateGoalForm();
            });
        }

        const goalAmount = document.getElementById('goalAmount');
        const goalDeadline = document.getElementById('goalDeadline');
        const monthlyContribution = document.getElementById('monthlyContribution');

        if (goalAmount) goalAmount.addEventListener('input', () => this.calculateGoalPlan());
        if (goalDeadline) goalDeadline.addEventListener('change', () => this.calculateGoalPlan());
        if (monthlyContribution) monthlyContribution.addEventListener('input', () => this.calculateGoalPlan());

        const retirementInputs = [
            'expectedReturn', 'currentAge', 'retirementAge', 'retirementCorpus',
            'currentSavings', 'inflationRate', 'retirementSpending', 'socialSecurity'
        ];

        retirementInputs.forEach(inputId => {
            const element = document.getElementById(inputId);
            if (element) {
                element.addEventListener('input', () => this.updateRetirementCalculation());
            }
        });

        window.addEventListener('resize', () => this.handleResize());
    }

    setupCreateGoalForm() {
        console.log('Setting up create goal form...');
        const deadlineInput = document.getElementById('goalDeadline');
        if (deadlineInput && !deadlineInput.value) {
            const threeMonthsLater = new Date();
            threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
            deadlineInput.value = threeMonthsLater.toISOString().split('T')[0];
        }
        this.calculateGoalPlan();
    }

    calculateGoalPlan() {
        const targetAmount = parseFloat(document.getElementById('goalAmount')?.value) || 0;
        const deadline = document.getElementById('goalDeadline')?.value;
        const monthlyContribution = parseFloat(document.getElementById('monthlyContribution')?.value) || 0;
        const initialAmount = parseFloat(document.getElementById('initialAmount')?.value) || 0;

        if (!targetAmount || !deadline) {
            this.hideCalculationPreview();
            return;
        }

        const deadlineDate = new Date(deadline);
        const today = new Date();
        const monthsToGoal = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24 * 30.44));
        
        let requiredMonthly = monthlyContribution;
        if (!monthlyContribution && monthsToGoal > 0) {
            requiredMonthly = (targetAmount - initialAmount) / monthsToGoal;
        }

        const totalMonths = monthsToGoal;
        const pace = requiredMonthly > 0 ? 'On Track' : 'Adjust Plan Needed';

        this.showCalculationPreview(requiredMonthly, totalMonths, pace);
    }

    showCalculationPreview(monthly, months, pace) {
        const preview = document.getElementById('calculationPreview');
        const monthlyElement = document.getElementById('previewMonthly');
        const monthsElement = document.getElementById('previewMonths');
        const paceElement = document.getElementById('previewPace');

        if (preview && monthlyElement && monthsElement && paceElement) {
            monthlyElement.textContent = this.formatCurrency(monthly);
            monthsElement.textContent = Math.max(0, months);
            paceElement.textContent = pace;
            preview.style.display = 'block';
        }
    }

    hideCalculationPreview() {
        const preview = document.getElementById('calculationPreview');
        if (preview) {
            preview.style.display = 'none';
        }
    }

    handleResize() {
        if (this.goals.length > 0) {
            this.renderGoals();
        }
        if (this.retirementChart) {
            this.retirementChart.resize();
        }
    }

    setupRetirementCalculator() {
        const defaults = {
            'currentAge': 30,
            'retirementAge': 60,
            'retirementCorpus': 5000000,
            'currentSavings': 500000,
            'expectedReturn': 8,
            'inflationRate': 5,
            'retirementSpending': 1200000,
            'socialSecurity': 300000
        };

        Object.entries(defaults).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element && !element.value) {
                element.value = value;
            }
        });
        
        this.updateRetirementCalculation();
    }

    async updateRetirementCalculation() {
        try {
            const calculationData = {
                currentAge: parseInt(document.getElementById('currentAge')?.value) || 30,
                retirementAge: parseInt(document.getElementById('retirementAge')?.value) || 60,
                currentSavings: parseFloat(document.getElementById('currentSavings')?.value) || 0,
                desiredCorpus: parseFloat(document.getElementById('retirementCorpus')?.value) || 5000000,
                expectedReturn: parseFloat(document.getElementById('expectedReturn')?.value) || 8,
                inflationRate: parseFloat(document.getElementById('inflationRate')?.value) || 5,
                retirementSpending: parseFloat(document.getElementById('retirementSpending')?.value) || 1200000,
                socialSecurity: parseFloat(document.getElementById('socialSecurity')?.value) || 0
            };

            const returnValue = document.getElementById('returnValue');
            const inflationValue = document.getElementById('inflationValue');
            if (returnValue) returnValue.textContent = calculationData.expectedReturn + '%';
            if (inflationValue) inflationValue.textContent = calculationData.inflationRate + '%';

            const response = await this.apiCall('/goals/retirement-calculate', {
                method: 'POST',
                body: calculationData
            });

            if (response.success) {
                const calculation = response.calculation;
                this.displayRetirementResults(calculation);
                this.updateRetirementChart(calculationData, calculation);
            }
        } catch (error) {
            console.error('Error calculating retirement:', error);
            this.fallbackRetirementCalculation();
        }
    }

    fallbackRetirementCalculation() {
        const currentAge = parseInt(document.getElementById('currentAge')?.value) || 30;
        const retirementAge = parseInt(document.getElementById('retirementAge')?.value) || 60;
        const currentSavings = parseFloat(document.getElementById('currentSavings')?.value) || 0;
        const desiredCorpus = parseFloat(document.getElementById('retirementCorpus')?.value) || 5000000;
        const expectedReturn = parseFloat(document.getElementById('expectedReturn')?.value) || 8;
        
        const yearsToRetirement = retirementAge - currentAge;
        const futureValueOfCurrentSavings = currentSavings * Math.pow(1 + expectedReturn/100, yearsToRetirement);
        const futureValueNeeded = desiredCorpus - futureValueOfCurrentSavings;
        
        let monthlyInvestment = 0;
        if (futureValueNeeded > 0) {
            const monthlyReturn = expectedReturn / 12 / 100;
            const monthsToRetirement = yearsToRetirement * 12;
            monthlyInvestment = futureValueNeeded * (monthlyReturn) / (Math.pow(1 + monthlyReturn, monthsToRetirement) - 1);
        }

        const calculation = {
            monthlyInvestment: Math.max(0, monthlyInvestment),
            totalInvestment: monthlyInvestment * yearsToRetirement * 12,
            yearsToRetirement: yearsToRetirement,
            futureValueOfCurrentSavings: futureValueOfCurrentSavings,
            futureRetirementSpending: 0,
            annualRetirementIncome: 0,
            incomeGap: 0,
            readinessPercentage: 0
        };

        this.displayRetirementResults(calculation);
    }

    displayRetirementResults(calculation) {
        const monthlyInvestment = document.getElementById('monthlyInvestment');
        const yearsToRetirement = document.getElementById('yearsToRetirement');
        const totalInvestment = document.getElementById('totalInvestment');
        const additionalResults = document.getElementById('additionalResults');

        if (monthlyInvestment) monthlyInvestment.textContent = this.formatCurrency(calculation.monthlyInvestment);
        if (yearsToRetirement) yearsToRetirement.textContent = calculation.yearsToRetirement;
        if (totalInvestment) totalInvestment.textContent = this.formatCurrency(calculation.totalInvestment);

        if (additionalResults) {
            additionalResults.innerHTML = `
                <div class="result-item">
                    <span>Future Value of Current Savings:</span>
                    <strong>${this.formatCurrency(calculation.futureValueOfCurrentSavings)}</strong>
                </div>
                <div class="result-item">
                    <span>Monthly Investment Needed:</span>
                    <strong>${this.formatCurrency(calculation.monthlyInvestment)}</strong>
                </div>
                <div class="result-item">
                    <span>Total Investment:</span>
                    <strong>${this.formatCurrency(calculation.totalInvestment)}</strong>
                </div>
            `;
        }
    }

    updateRetirementChart(calculationData, calculation) {
        const ctx = document.getElementById('retirementChart');
        if (!ctx) return;

        if (this.retirementChart) {
            this.retirementChart.destroy();
        }

        const years = calculation.yearsToRetirement;
        const labels = [];
        const savingsData = [];

        let currentSavings = calculationData.currentSavings;
        const monthlyInvestment = calculation.monthlyInvestment;
        const annualReturn = calculationData.expectedReturn / 100;

        for (let i = 0; i <= years; i++) {
            const age = calculationData.currentAge + i;
            labels.push(`Age ${age}`);
            
            if (i === 0) {
                savingsData.push(currentSavings);
            } else {
                currentSavings = currentSavings * (1 + annualReturn) + (monthlyInvestment * 12);
                savingsData.push(currentSavings);
            }
        }

        this.retirementChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Projected Savings',
                    data: savingsData,
                    borderColor: '#4361ee',
                    backgroundColor: 'rgba(67, 97, 238, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => this.formatCurrency(value)
                        }
                    }
                }
            }
        });
    }

    updateCharts() {
        if (this.goals.length === 0) {
            this.showEmptyAnalytics();
            return;
        }
        this.updateProgressChart();
        this.updateSavingsChart();
        this.updateDistributionChart();
        this.updateTrendChart();
    }

    updateProgressChart() {
        const ctx = document.getElementById('timeline-chart');
        if (!ctx) return;

        const sortedGoals = [...this.goals]
            .filter(goal => !goal.completed)
            .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
            .slice(0, 6);

        if (sortedGoals.length === 0) {
            this.showEmptyChart('timeline-chart', 'No active goals to display');
            return;
        }

        const labels = sortedGoals.map(goal => {
            const title = goal.title.length > 15 ? goal.title.substring(0, 15) + '...' : goal.title;
            return title;
        });
        
        const progressData = sortedGoals.map(goal => {
            return goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
        });

        if (this.progressChart) {
            this.progressChart.destroy();
        }

        this.progressChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Current Progress',
                        data: progressData,
                        backgroundColor: '#4361ee',
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const goal = sortedGoals[context.dataIndex];
                                const progress = progressData[context.dataIndex];
                                return [
                                    `Progress: ${progress.toFixed(1)}%`,
                                    `Saved: ${this.formatCurrency(goal.currentAmount)}`,
                                    `Target: ${this.formatCurrency(goal.targetAmount)}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Progress (%)'
                        }
                    }
                }
            }
        });
    }

    updateSavingsChart() {
        const ctx = document.getElementById('savings-chart');
        if (!ctx) return;

        const totalSaved = this.goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
        const totalTarget = this.goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
        const remainingAmount = Math.max(0, totalTarget - totalSaved);

        if (totalTarget === 0) {
            this.showEmptyChart('savings-chart', 'No goals with targets set');
            return;
        }

        if (this.savingsChart) {
            this.savingsChart.destroy();
        }

        this.savingsChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Amount Saved', 'Remaining Target'],
                datasets: [{
                    data: [totalSaved, remainingAmount],
                    backgroundColor: ['#4ade80', '#e5e7eb'],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label;
                                const value = context.parsed;
                                return `${label}: ${this.formatCurrency(value)}`;
                            }
                        }
                    }
                }
            }
        });
    }

    updateDistributionChart() {
        const ctx = document.getElementById('distribution-chart');
        if (!ctx) return;

        const categoryData = {};
        this.goals.forEach(goal => {
            if (!categoryData[goal.category]) {
                categoryData[goal.category] = {
                    count: 0,
                    totalAmount: 0
                };
            }
            categoryData[goal.category].count++;
            categoryData[goal.category].totalAmount += goal.targetAmount;
        });

        const categories = Object.keys(categoryData);
        
        if (categories.length === 0) {
            this.showEmptyChart('distribution-chart', 'No goals by category');
            return;
        }

        const counts = categories.map(cat => categoryData[cat].count);

        const categoryColors = {
            emergency: '#4361ee',
            vacation: '#4cc9f0',
            vehicle: '#7209b7',
            home: '#f59e0b',
            education: '#4ade80',
            retirement: '#f72585',
            wedding: '#e1156d',
            gadgets: '#8b5cf6',
            health: '#06d6a0',
            savings: '#3b82f6',
            investment: '#8b5cf6',
            debt: '#ef4444',
            purchase: '#f59e0b',
            other: '#6b7280'
        };

        if (this.distributionChart) {
            this.distributionChart.destroy();
        }

        this.distributionChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: categories.map(cat => {
                    const count = categoryData[cat].count;
                    return `${cat.charAt(0).toUpperCase() + cat.slice(1)} (${count})`;
                }),
                datasets: [{
                    data: counts,
                    backgroundColor: categories.map(cat => categoryColors[cat] || '#6b7280'),
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right'
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const category = categories[context.dataIndex];
                                const data = categoryData[category];
                                return [
                                    `Goals: ${data.count}`,
                                    `Total Target: ${this.formatCurrency(data.totalAmount)}`
                                ];
                            }
                        }
                    }
                }
            }
        });
    }

    updateTrendChart() {
        const ctx = document.getElementById('trend-chart');
        if (!ctx) return;

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentMonth = new Date().getMonth();
        
        const labels = [];
        const savingsData = [];

        for (let i = 5; i >= 0; i--) {
            const monthIndex = (currentMonth - i + 12) % 12;
            labels.push(months[monthIndex]);
            
            const baseSavings = this.goals.reduce((sum, goal) => sum + goal.currentAmount, 0) * 0.1;
            const monthlyGrowth = baseSavings * (1 + i * 0.2);
            savingsData.push(monthlyGrowth);
        }

        if (this.trendChart) {
            this.trendChart.destroy();
        }

        this.trendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Monthly Savings Trend',
                        data: savingsData,
                        borderColor: '#4361ee',
                        backgroundColor: 'rgba(67, 97, 238, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
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

    showEmptyChart(canvasId, message) {
        const canvas = document.getElementById(canvasId);
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.font = '14px Arial';
            ctx.fillStyle = '#6b7280';
            ctx.textAlign = 'center';
            ctx.fillText(message, canvas.width / 2, canvas.height / 2);
        }
    }

    showEmptyAnalytics() {
        const charts = ['timeline-chart', 'savings-chart', 'distribution-chart', 'trend-chart'];
        charts.forEach(chartId => {
            this.showEmptyChart(chartId, 'No goals data available');
        });
    }

    updateAnalytics() {
        const period = document.getElementById('analytics-period')?.value || 'month';
        console.log('Updating analytics for period:', period);
        this.updateCharts();
    }

    async createGoal() {
        try {
            if (!this.checkAuth()) return;

            const title = document.getElementById('goalTitle')?.value;
            const category = document.getElementById('goalCategory')?.value;
            const targetAmount = parseFloat(document.getElementById('goalAmount')?.value);
            const deadline = document.getElementById('goalDeadline')?.value;
            const priority = document.getElementById('goalPriority')?.value;
            const description = document.getElementById('goalDescription')?.value;
            const monthlyContribution = document.getElementById('monthlyContribution')?.value;
            const initialAmount = parseFloat(document.getElementById('initialAmount')?.value) || 0;

            if (!title || !category || !targetAmount || !deadline) {
                AuthUtils.showMessage('Please fill in all required fields', 'error');
                return;
            }

            if (targetAmount <= 0) {
                AuthUtils.showMessage('Target amount must be greater than 0', 'error');
                return;
            }

            if (new Date(deadline) <= new Date()) {
                AuthUtils.showMessage('Deadline must be in the future', 'error');
                return;
            }

            const goalData = {
                title,
                category,
                targetAmount,
                deadline,
                priority,
                description: description || '',
                monthlyContribution: monthlyContribution ? parseFloat(monthlyContribution) : undefined,
                currentAmount: initialAmount
            };

            console.log('Creating goal with data:', goalData);

            const response = await this.apiCall('/goals', {
                method: 'POST',
                body: goalData
            });

            if (response.success) {
                AuthUtils.showMessage('Goal created successfully!', 'success');
                const modal = bootstrap.Modal.getInstance(document.getElementById('createGoalModal'));
                if (modal) modal.hide();
                
                await this.loadGoals();
                this.triggerDashboardUpdate();
            }
        } catch (error) {
            console.error('Error creating goal:', error);
            AuthUtils.showMessage(error.message || 'Failed to create goal', 'error');
        }
    }

    async createRetirementGoal() {
        try {
            const monthlyInvestmentText = document.getElementById('monthlyInvestment')?.textContent;
            const monthlyInvestment = parseFloat(monthlyInvestmentText?.replace(/[^0-9.-]+/g,"")) || 0;
            const retirementAge = parseInt(document.getElementById('retirementAge')?.value) || 60;
            const corpus = parseFloat(document.getElementById('retirementCorpus')?.value) || 0;
            const currentSavings = parseFloat(document.getElementById('currentSavings')?.value) || 0;

            if (corpus <= 0) {
                AuthUtils.showMessage('Please set a valid retirement corpus amount', 'error');
                return;
            }

            const currentAge = parseInt(document.getElementById('currentAge')?.value) || 30;
            const yearsToRetirement = retirementAge - currentAge;
            const retirementDate = new Date();
            retirementDate.setFullYear(retirementDate.getFullYear() + yearsToRetirement);

            const goalData = {
                title: `Retirement Corpus - ${this.formatCurrency(corpus)}`,
                category: 'retirement',
                targetAmount: corpus,
                deadline: retirementDate.toISOString().split('T')[0],
                priority: 'high',
                description: `Retirement planning goal to achieve ${this.formatCurrency(corpus)} by age ${retirementAge}. Monthly investment: ${this.formatCurrency(monthlyInvestment)}`,
                monthlyContribution: monthlyInvestment,
                currentAmount: currentSavings,
                alerts: true
            };

            console.log('Creating retirement goal:', goalData);

            const response = await this.apiCall('/goals', {
                method: 'POST',
                body: goalData
            });

            if (response.success) {
                AuthUtils.showMessage('Retirement goal created successfully!', 'success');
                const modal = bootstrap.Modal.getInstance(document.getElementById('retirementGoalModal'));
                if (modal) modal.hide();
                await this.loadGoals();
                this.triggerDashboardUpdate();
            }
        } catch (error) {
            console.error('Error creating retirement goal:', error);
            AuthUtils.showMessage(error.message || 'Failed to create retirement goal', 'error');
        }
    }

    formatCurrency(amount) {
        return AuthUtils.formatCurrency(amount);
    }

    formatCurrencyCompact(amount) {
        if (amount >= 10000000) {
            return '₹' + (amount / 10000000).toFixed(2) + 'Cr';
        } else if (amount >= 100000) {
            return '₹' + (amount / 100000).toFixed(2) + 'L';
        } else if (amount >= 1000) {
            return '₹' + (amount / 1000).toFixed(2) + 'K';
        } else {
            return '₹' + amount.toFixed(2);
        }
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    getCategoryColor(category) {
        const colors = {
            emergency: '#4361ee',
            vacation: '#4cc9f0',
            vehicle: '#7209b7',
            home: '#f59e0b',
            education: '#4ade80',
            retirement: '#f72585',
            wedding: '#e1156d',
            gadgets: '#8b5cf6',
            health: '#06d6a0',
            other: '#6b7280'
        };
        return colors[category] || '#6b7280';
    }

    getCategoryIcon(category) {
        const icons = {
            emergency: 'bi-shield-check',
            vacation: 'bi-airplane',
            vehicle: 'bi-car-front',
            home: 'bi-house',
            education: 'bi-mortarboard',
            retirement: 'bi-umbrella',
            wedding: 'bi-heart',
            gadgets: 'bi-phone',
            health: 'bi-heart-pulse',
            other: 'bi-flag'
        };
        return icons[category] || 'bi-flag';
    }

    triggerDashboardUpdate() {
        document.dispatchEvent(new CustomEvent('goalsUpdated'));
        localStorage.setItem('fintrack_goals_updated', Date.now().toString());
    }
}

// Global functions
function createGoal() {
    if (window.goalsManager && typeof window.goalsManager.createGoal === 'function') {
        window.goalsManager.createGoal();
    } else {
        console.error('Goals manager not initialized');
        AuthUtils.showMessage('Please wait for goals manager to initialize', 'error');
    }
}

function createRetirementGoal() {
    if (window.goalsManager && typeof window.goalsManager.createRetirementGoal === 'function') {
        window.goalsManager.createRetirementGoal();
    } else {
        console.error('Goals manager not initialized');
        AuthUtils.showMessage('Please wait for goals manager to initialize', 'error');
    }
}

function showCreateGoalModal() {
    const modal = new bootstrap.Modal(document.getElementById('createGoalModal'));
    
    const form = document.getElementById('createGoalForm');
    if (form) form.reset();
    
    const deadlineInput = document.getElementById('goalDeadline');
    if (deadlineInput) {
        const threeMonthsLater = new Date();
        threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
        deadlineInput.value = threeMonthsLater.toISOString().split('T')[0];
    }
    
    modal.show();
}

function showRetirementGoalModal() {
    const modal = new bootstrap.Modal(document.getElementById('retirementGoalModal'));
    modal.show();
}

function changeGoalsView(view) {
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`[data-view="${view}"]`);
    if (activeBtn) activeBtn.classList.add('active');
    
    document.querySelectorAll('.goals-container').forEach(container => {
        container.classList.remove('active');
    });
    const activeContainer = document.getElementById(`goals-${view}`);
    if (activeContainer) activeContainer.classList.add('active');
    
    localStorage.setItem('goalsViewPreference', view);
}

function filterGoals() {
    const filter = document.getElementById('goal-filter')?.value;
    console.log('Filtering goals by:', filter);
}

function sortGoals() {
    const sortBy = document.getElementById('goal-sort')?.value;
    console.log('Sorting goals by:', sortBy);
}

function quickCreateGoal(title, amount, priority) {
    const titleInput = document.getElementById('goalTitle');
    const amountInput = document.getElementById('goalAmount');
    const prioritySelect = document.getElementById('goalPriority');
    
    if (titleInput) titleInput.value = title;
    if (amountInput) amountInput.value = amount;
    if (prioritySelect) prioritySelect.value = priority;
    
    const categoryMap = {
        'Emergency Fund': 'emergency',
        'Dream Vacation': 'vacation',
        'Vehicle Purchase': 'vehicle',
        'Home Down Payment': 'home',
        'Education Fund': 'education'
    };
    
    const categorySelect = document.getElementById('goalCategory');
    if (categorySelect && categoryMap[title]) {
        categorySelect.value = categoryMap[title];
    }
    
    showCreateGoalModal();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing GoalsManager...');
    window.goalsManager = new GoalsManager();
    
    const savedView = localStorage.getItem('goalsViewPreference') || 'grid';
    changeGoalsView(savedView);
    
    window.createGoal = createGoal;
    window.createRetirementGoal = createRetirementGoal;
    window.showCreateGoalModal = showCreateGoalModal;
    window.showRetirementGoalModal = showRetirementGoalModal;
    window.changeGoalsView = changeGoalsView;
    window.filterGoals = filterGoals;
    window.sortGoals = sortGoals;
    window.quickCreateGoal = quickCreateGoal;
});