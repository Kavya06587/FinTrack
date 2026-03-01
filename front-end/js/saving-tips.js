// Saving Tips JavaScript

// Sample saving tips data
const savingTips = [
    {
        id: 1,
        title: "Brew Your Own Coffee",
        description: "Instead of buying expensive coffee shop drinks daily, make your own at home. A homemade coffee costs about ₹20 versus ₹150+ at a cafe.",
        category: "daily",
        savings: "₹4,000/month",
        icon: "bi bi-cup-straw"
    },
    {
        id: 2,
        title: "Plan Weekly Meals",
        description: "Create a meal plan for the week and shop with a list. This reduces impulse buys and food waste significantly.",
        category: "food",
        savings: "₹3,000/month",
        icon: "bi bi-egg-fried"
    },
    {
        id: 3,
        title: "Use Energy-Efficient Bulbs",
        description: "Replace incandescent bulbs with LED lights. They use 75% less energy and last 25 times longer.",
        category: "utilities",
        savings: "₹500/month",
        icon: "bi bi-lightning-charge"
    },
    {
        id: 4,
        title: "Unplug Electronics",
        description: "Devices on standby still consume power. Unplug chargers and electronics when not in use.",
        category: "utilities",
        savings: "₹300/month",
        icon: "bi bi-plug"
    },
    {
        id: 5,
        title: "Buy Generic Brands",
        description: "Store brands often have the same quality as name brands but cost 20-30% less.",
        category: "shopping",
        savings: "₹2,000/month",
        icon: "bi bi-bag"
    },
    {
        id: 6,
        title: "Use Public Transport",
        description: "If possible, use public transportation instead of driving. Consider carpooling for work commutes.",
        category: "transport",
        savings: "₹5,000/month",
        icon: "bi bi-bus-front"
    },
    {
        id: 7,
        title: "Cancel Unused Subscriptions",
        description: "Review your monthly subscriptions and cancel those you don't actively use.",
        category: "daily",
        savings: "₹1,500/month",
        icon: "bi bi-credit-card"
    },
    {
        id: 8,
        title: "Cook in Batches",
        description: "Prepare larger quantities of food and freeze portions for later. Saves time and reduces takeout costs.",
        category: "food",
        savings: "₹2,500/month",
        icon: "bi bi-egg-fried"
    },
    {
        id: 9,
        title: "Negotiate Bills",
        description: "Call service providers to negotiate better rates on internet, phone, and insurance bills.",
        category: "utilities",
        savings: "₹1,000/month",
        icon: "bi bi-telephone"
    },
    {
        id: 10,
        title: "Wait 24 Hours Before Buying",
        description: "Implement a 24-hour waiting period for non-essential purchases to avoid impulse buying.",
        category: "shopping",
        savings: "₹3,000/month",
        icon: "bi bi-clock"
    },
    {
        id: 11,
        title: "Bike or Walk Short Distances",
        description: "For distances under 2km, consider walking or biking instead of using fuel.",
        category: "transport",
        savings: "₹1,200/month",
        icon: "bi bi-bicycle"
    },
    {
        id: 12,
        title: "Develop Side Income",
        description: "Use your skills to create additional income streams through freelancing or part-time work.",
        category: "income",
        savings: "₹10,000+/month",
        icon: "bi bi-graph-up-arrow"
    }
];

// DOM Elements
const tipsContainer = document.getElementById('tipsContainer');
const filterButtons = document.querySelectorAll('.filter-btn');
const categoryCards = document.querySelectorAll('.category-card');
const calculateBtn = document.getElementById('calculateBtn');
const calculatorResult = document.getElementById('calculatorResult');
const totalSavingsEl = document.getElementById('totalSavings');

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    renderTips('all');
    
    // Event Listeners
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            filterTips(filter);
        });
    });
    
    categoryCards.forEach(card => {
        card.addEventListener('click', function() {
            const category = this.getAttribute('data-category');
            filterTips(category);
            
            // Update active states
            categoryCards.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            
            // Update filter buttons
            filterButtons.forEach(btn => {
                if (btn.getAttribute('data-filter') === category) {
                    btn.classList.add('active');
                } else if (category === 'all') {
                    btn.classList.remove('active');
                    document.querySelector('[data-filter="all"]').classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        });
    });
    
    calculateBtn.addEventListener('click', calculateSavings);
    
    // Initialize calculator
    calculateSavings();
});

// Render tips based on filter
function renderTips(filter) {
    tipsContainer.innerHTML = '';
    
    const filteredTips = filter === 'all' 
        ? savingTips 
        : savingTips.filter(tip => tip.category === filter);
    
    if (filteredTips.length === 0) {
        tipsContainer.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="bi bi-search"></i>
                <h3>No tips found</h3>
                <p>Try selecting a different category</p>
            </div>
        `;
        return;
    }
    
    filteredTips.forEach(tip => {
        const tipCard = document.createElement('div');
        tipCard.className = 'tip-card';
        tipCard.innerHTML = `
            <span class="tip-category">${getCategoryName(tip.category)}</span>
            <div class="tip-icon">
                <i class="${tip.icon}"></i>
            </div>
            <h3 class="tip-title">${tip.title}</h3>
            <p class="tip-description">${tip.description}</p>
            <div class="tip-savings">
                <span class="savings-amount">${tip.savings}</span>
                <span class="savings-label">Potential Savings</span>
            </div>
        `;
        
        tipsContainer.appendChild(tipCard);
    });
}

// Filter tips based on category
function filterTips(filter) {
    renderTips(filter);
    
    // Update active button state
    filterButtons.forEach(btn => {
        if (btn.getAttribute('data-filter') === filter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Scroll to tips section
    document.getElementById('tips-section').scrollIntoView({
        behavior: 'smooth'
    });
}

// Get category display name
function getCategoryName(category) {
    const categories = {
        'daily': 'Daily Expenses',
        'food': 'Food & Groceries',
        'utilities': 'Utilities',
        'shopping': 'Shopping',
        'transport': 'Transportation',
        'income': 'Income Growth'
    };
    
    return categories[category] || category;
}

// Calculate savings impact
function calculateSavings() {
    const dailySave = parseFloat(document.getElementById('dailySave').value) || 0;
    const timePeriod = parseInt(document.getElementById('timePeriod').value) || 365;
    
    const totalSavings = dailySave * timePeriod;
    
    totalSavingsEl.textContent = totalSavings.toLocaleString('en-IN');
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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderTips);
} else {
    renderTips('all');
}