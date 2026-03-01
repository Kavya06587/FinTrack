// Financial Literacy JavaScript

// DOM Elements
const startModuleButtons = document.querySelectorAll('.start-module');
const progressBars = document.querySelectorAll('.progress-fill');
const progressTexts = document.querySelectorAll('.progress-text');
const circleProgress = document.querySelector('.circle-progress');
const progressValue = document.querySelector('.progress-value');

// Module progress data
let moduleProgress = {
    budgeting: 0,
    saving: 0,
    credit: 0,
    investing: 0,
    insurance: 0,
    retirement: 0
};

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Event Listeners
    startModuleButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const module = this.getAttribute('data-module');
            startModule(module);
        });
    });
    
    // Initialize progress from localStorage if available
    loadProgress();
    updateOverallProgress();
});

// Start a learning module
function startModule(module) {
    // In a real implementation, this would navigate to the module content
    // For this demo, we'll simulate progress
    
    const moduleIndex = getModuleIndex(module);
    if (moduleIndex === -1) return;
    
    // Simulate completing some of the module
    const currentProgress = moduleProgress[module];
    const newProgress = Math.min(currentProgress + 25, 100);
    
    moduleProgress[module] = newProgress;
    
    // Update UI
    updateModuleProgress(moduleIndex, newProgress);
    updateOverallProgress();
    
    // Save progress to localStorage
    saveProgress();
    
    // Show notification
    const moduleNames = {
        budgeting: 'Budgeting Basics',
        saving: 'Saving Strategies',
        credit: 'Credit & Debt Management',
        investing: 'Investment Fundamentals',
        insurance: 'Insurance & Protection',
        retirement: 'Retirement Planning'
    };
    
    showNotification(
        `Module Started: ${moduleNames[module]}`,
        `Your progress: ${newProgress}%`,
        'success'
    );
}

// Get module index for UI updates
function getModuleIndex(module) {
    const modules = ['budgeting', 'saving', 'credit', 'investing', 'insurance', 'retirement'];
    return modules.indexOf(module);
}

// Update individual module progress
function updateModuleProgress(moduleIndex, progress) {
    if (moduleIndex >= 0 && moduleIndex < progressBars.length) {
        progressBars[moduleIndex].style.width = `${progress}%`;
        progressTexts[moduleIndex].textContent = `${progress}%`;
        
        // Update button text if module is completed
        if (progress === 100) {
            startModuleButtons[moduleIndex].textContent = 'Completed';
            startModuleButtons[moduleIndex].classList.remove('btn-outline');
            startModuleButtons[moduleIndex].classList.add('btn-success');
        }
    }
}

// Update overall literacy score
function updateOverallProgress() {
    const totalProgress = Object.values(moduleProgress).reduce((sum, progress) => sum + progress, 0);
    const averageProgress = Math.round(totalProgress / Object.keys(moduleProgress).length);
    
    // Update circle progress
    circleProgress.style.background = `conic-gradient(#fff ${averageProgress}%, rgba(255,255,255,0.3) ${averageProgress}%)`;
    progressValue.textContent = `${averageProgress}%`;
    
    // Update health check status based on progress
    updateHealthCheckStatus(averageProgress);
}

// Update health check status indicators
function updateHealthCheckStatus(overallProgress) {
    const emergencyFundStatus = document.getElementById('emergencyFundStatus');
    const dtiStatus = document.getElementById('dtiStatus');
    const retirementStatus = document.getElementById('retirementStatus');
    
    // Simple logic for demo purposes
    // In a real implementation, this would be based on actual user data
    
    if (overallProgress >= 75) {
        emergencyFundStatus.innerHTML = '<span class="status-badge success">Excellent</span>';
        dtiStatus.innerHTML = '<span class="status-badge success">Healthy</span>';
        retirementStatus.innerHTML = '<span class="status-badge success">On Track</span>';
    } else if (overallProgress >= 50) {
        emergencyFundStatus.innerHTML = '<span class="status-badge warning">Good</span>';
        dtiStatus.innerHTML = '<span class="status-badge warning">Moderate</span>';
        retirementStatus.innerHTML = '<span class="status-badge warning">Needs Work</span>';
    } else {
        emergencyFundStatus.innerHTML = '<span class="status-badge danger">Needs Attention</span>';
        dtiStatus.innerHTML = '<span class="status-badge danger">High</span>';
        retirementStatus.innerHTML = '<span class="status-badge danger">Behind</span>';
    }
}

// Save progress to localStorage
function saveProgress() {
    localStorage.setItem('financialLiteracyProgress', JSON.stringify(moduleProgress));
}

// Load progress from localStorage
function loadProgress() {
    const savedProgress = localStorage.getItem('financialLiteracyProgress');
    if (savedProgress) {
        moduleProgress = JSON.parse(savedProgress);
        
        // Update UI with saved progress
        Object.keys(moduleProgress).forEach((module, index) => {
            updateModuleProgress(index, moduleProgress[module]);
        });
    }
}

// Utility function to show notifications
function showNotification(title, message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1050;
        min-width: 300px;
        max-width: 400px;
    `;
    notification.innerHTML = `
        <h6 class="alert-heading">${title}</h6>
        <p class="mb-0">${message}</p>
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