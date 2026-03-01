// Debt Management JavaScript

// DOM Elements
const calculateBtn = document.getElementById('calculateBtn');
const calculatorResult = document.getElementById('calculatorResult');
const strategyButtons = document.querySelectorAll('.strategy-select');

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Event Listeners
    calculateBtn.addEventListener('click', calculateDebtPayoff);
    strategyButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const strategy = this.getAttribute('data-strategy');
            selectStrategy(strategy);
        });
    });
    
    // Initialize calculator
    calculateDebtPayoff();
});

// Calculate debt payoff
function calculateDebtPayoff() {
    const totalDebt = parseFloat(document.getElementById('totalDebt').value) || 0;
    const interestRate = parseFloat(document.getElementById('interestRate').value) || 0;
    const monthlyPayment = parseFloat(document.getElementById('monthlyPayment').value) || 0;
    
    if (monthlyPayment <= 0) {
        alert('Please enter a valid monthly payment amount.');
        return;
    }
    
    const monthlyRate = interestRate / 100 / 12;
    let remainingDebt = totalDebt;
    let months = 0;
    let totalInterest = 0;
    
    // Calculate months to payoff
    while (remainingDebt > 0 && months < 600) { // Cap at 50 years
        const interest = remainingDebt * monthlyRate;
        const principal = monthlyPayment - interest;
        
        if (principal <= 0) {
            // Payment doesn't cover interest - debt will never be paid off
            months = Infinity;
            break;
        }
        
        remainingDebt -= principal;
        totalInterest += interest;
        months++;
        
        if (remainingDebt < 0) {
            remainingDebt = 0;
        }
    }
    
    const totalPaid = totalDebt + totalInterest;
    
    if (months === Infinity) {
        document.getElementById('payoffTime').textContent = 'Never';
        document.getElementById('totalInterest').textContent = '∞';
        document.getElementById('totalPaid').textContent = '∞';
    } else {
        const years = Math.floor(months / 12);
        const remainingMonths = months % 12;
        
        let payoffTime = '';
        if (years > 0) {
            payoffTime += `${years} year${years > 1 ? 's' : ''}`;
        }
        if (remainingMonths > 0) {
            if (years > 0) payoffTime += ' ';
            payoffTime += `${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
        }
        
        document.getElementById('payoffTime').textContent = payoffTime || '0 months';
        document.getElementById('totalInterest').textContent = Math.round(totalInterest).toLocaleString('en-IN');
        document.getElementById('totalPaid').textContent = Math.round(totalPaid).toLocaleString('en-IN');
    }
    
    calculatorResult.style.display = 'block';
    
    // Add animation effect
    calculatorResult.style.opacity = '0';
    calculatorResult.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        calculatorResult.style.transition = 'all 0.5s ease';
        calculatorResult.style.opacity = '1';
        calculatorResult.style.transform = 'translateY(0)';
    }, 100);
}

// Handle strategy selection
function selectStrategy(strategy) {
    // Remove active class from all buttons
    strategyButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to selected button
    event.target.classList.add('active');
    
    let message = '';
    let description = '';
    
    switch(strategy) {
        case 'avalanche':
            message = 'Avalanche Method Selected';
            description = 'You\'ll save the most on interest by targeting high-rate debts first.';
            break;
        case 'snowball':
            message = 'Snowball Method Selected';
            description = 'You\'ll build momentum by paying off small debts first for quick wins.';
            break;
        case 'consolidation':
            message = 'Debt Consolidation Selected';
            description = 'Consider combining debts into one loan with a lower interest rate.';
            break;
    }
    
    // Show notification
    showNotification(message, description, 'info');
    
    // Scroll to calculator
    document.querySelector('.calculator-section').scrollIntoView({
        behavior: 'smooth'
    });
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