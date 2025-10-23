// Savings Tracker JavaScript

// Sample initial goals (converted to rupees)
let goals = [
    {
        id: 1,
        name: "Emergency Fund",
        description: "3-6 months of living expenses for financial security",
        targetAmount: 100000,
        savedAmount: 42000,
        icon: "bi bi-umbrella"
    },
    {
        id: 2,
        name: "Japan Vacation",
        description: "Two-week trip to Tokyo, Kyoto, and Osaka",
        targetAmount: 50000,
        savedAmount: 15000,
        icon: "bi bi-airplane"
    }
];

// DOM Elements
const goalsContainer = document.getElementById('goalsContainer');
const emptyState = document.getElementById('emptyState');
const addGoalBtn = document.getElementById('addGoalBtn');
const goalModal = new bootstrap.Modal(document.getElementById('goalModal'));
const goalForm = document.getElementById('goalForm');
const addFundsModal = new bootstrap.Modal(document.getElementById('addFundsModal'));
const addFundsForm = document.getElementById('addFundsForm');

// Statistics elements
const totalGoalsEl = document.getElementById('totalGoals');
const completedGoalsEl = document.getElementById('completedGoals');
const totalSavedEl = document.getElementById('totalSaved');
const totalTargetEl = document.getElementById('totalTarget');

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    renderGoals();
    updateStats();
    
    // Event Listeners
    addGoalBtn.addEventListener('click', openAddGoalModal);
    goalForm.addEventListener('submit', handleGoalSubmit);
    addFundsForm.addEventListener('submit', handleAddFunds);
});

// Render all goals
function renderGoals() {
    if (goals.length === 0) {
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    goalsContainer.innerHTML = '';
    
    goals.forEach(goal => {
        const progress = (goal.savedAmount / goal.targetAmount) * 100;
        const isCompleted = goal.savedAmount >= goal.targetAmount;
        const amountNeeded = goal.targetAmount - goal.savedAmount;
        
        const goalCard = document.createElement('div');
        goalCard.className = 'goal-card';
        goalCard.innerHTML = `
            <div class="goal-icon">
                <i class="${goal.icon}"></i>
            </div>
            <h3 class="goal-title">${goal.name}</h3>
            <p class="goal-description">${goal.description}</p>
            
            <div class="progress-container">
                <div class="progress-info">
                    <span>₹${goal.savedAmount.toLocaleString('en-IN')} saved</span>
                    <span>₹${goal.targetAmount.toLocaleString('en-IN')} target</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${Math.min(progress, 100)}%"></div>
                </div>
                <div class="progress-info">
                    <span>${progress.toFixed(1)}%</span>
                    <span>${isCompleted ? 'Completed!' : '₹' + amountNeeded.toLocaleString('en-IN') + ' to go'}</span>
                </div>
            </div>
            
            <div class="goal-actions">
                <button class="btn btn-outline edit-goal" data-id="${goal.id}">
                    <i class="bi bi-pencil me-1"></i> Edit
                </button>
                <button class="btn btn-primary add-funds" data-id="${goal.id}">
                    <i class="bi bi-plus-circle me-1"></i> Add Funds
                </button>
                <button class="btn btn-danger delete-goal" data-id="${goal.id}">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        
        goalsContainer.appendChild(goalCard);
    });
    
    // Add event listeners to action buttons
    document.querySelectorAll('.edit-goal').forEach(btn => {
        btn.addEventListener('click', function() {
            const goalId = parseInt(this.getAttribute('data-id'));
            openEditGoalModal(goalId);
        });
    });
    
    document.querySelectorAll('.add-funds').forEach(btn => {
        btn.addEventListener('click', function() {
            const goalId = parseInt(this.getAttribute('data-id'));
            openAddFundsModal(goalId);
        });
    });
    
    document.querySelectorAll('.delete-goal').forEach(btn => {
        btn.addEventListener('click', function() {
            const goalId = parseInt(this.getAttribute('data-id'));
            deleteGoal(goalId);
        });
    });
}

// Update statistics
function updateStats() {
    const totalGoals = goals.length;
    const completedGoals = goals.filter(goal => goal.savedAmount >= goal.targetAmount).length;
    const totalSaved = goals.reduce((sum, goal) => sum + goal.savedAmount, 0);
    const totalTarget = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
    
    totalGoalsEl.textContent = totalGoals;
    completedGoalsEl.textContent = completedGoals;
    totalSavedEl.textContent = totalSaved.toLocaleString('en-IN');
    totalTargetEl.textContent = totalTarget.toLocaleString('en-IN');
}

// Modal Functions
function openAddGoalModal() {
    document.getElementById('modalTitle').textContent = 'Add New Savings Goal';
    document.getElementById('goalId').value = '';
    document.getElementById('goalName').value = '';
    document.getElementById('goalDescription').value = '';
    document.getElementById('targetAmount').value = '';
    document.getElementById('savedAmount').value = '0';
    document.getElementById('goalIcon').value = 'bi bi-house';
    
    goalModal.show();
}

function openEditGoalModal(goalId) {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    
    document.getElementById('modalTitle').textContent = 'Edit Savings Goal';
    document.getElementById('goalId').value = goal.id;
    document.getElementById('goalName').value = goal.name;
    document.getElementById('goalDescription').value = goal.description;
    document.getElementById('targetAmount').value = goal.targetAmount;
    document.getElementById('savedAmount').value = goal.savedAmount;
    document.getElementById('goalIcon').value = goal.icon;
    
    goalModal.show();
}

function openAddFundsModal(goalId) {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    
    document.getElementById('fundsGoalId').value = goal.id;
    document.getElementById('goalNameDisplay').value = goal.name;
    document.getElementById('currentSaved').value = `₹${goal.savedAmount.toLocaleString('en-IN')}`;
    document.getElementById('targetAmountDisplay').value = `₹${goal.targetAmount.toLocaleString('en-IN')}`;
    document.getElementById('amountToAdd').value = '';
    
    addFundsModal.show();
}

// Form Handlers
function handleGoalSubmit(e) {
    e.preventDefault();
    
    const goalId = document.getElementById('goalId').value;
    const name = document.getElementById('goalName').value;
    const description = document.getElementById('goalDescription').value;
    const targetAmount = parseFloat(document.getElementById('targetAmount').value);
    const savedAmount = parseFloat(document.getElementById('savedAmount').value);
    const icon = document.getElementById('goalIcon').value;
    
    if (goalId) {
        // Edit existing goal
        const index = goals.findIndex(g => g.id === parseInt(goalId));
        if (index !== -1) {
            goals[index] = {
                ...goals[index],
                name,
                description,
                targetAmount,
                savedAmount,
                icon
            };
        }
    } else {
        // Add new goal
        const newId = goals.length > 0 ? Math.max(...goals.map(g => g.id)) + 1 : 1;
        goals.push({
            id: newId,
            name,
            description,
            targetAmount,
            savedAmount,
            icon
        });
    }
    
    renderGoals();
    updateStats();
    goalModal.hide();
}

function handleAddFunds(e) {
    e.preventDefault();
    
    const goalId = parseInt(document.getElementById('fundsGoalId').value);
    const amountToAdd = parseFloat(document.getElementById('amountToAdd').value);
    
    const goal = goals.find(g => g.id === goalId);
    if (goal) {
        goal.savedAmount += amountToAdd;
        renderGoals();
        updateStats();
        addFundsModal.hide();
        
        // Show success message
        showNotification(`Successfully added ₹${amountToAdd.toLocaleString('en-IN')} to "${goal.name}"`, 'success');
    }
}

function deleteGoal(goalId) {
    if (confirm('Are you sure you want to delete this savings goal?')) {
        goals = goals.filter(g => g.id !== goalId);
        renderGoals();
        updateStats();
        
        // Show success message
        showNotification('Savings goal deleted successfully', 'info');
    }
}

// Utility function to show notifications
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1050;
        min-width: 300px;
    `;
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderGoals);
} else {
    renderGoals();
}
