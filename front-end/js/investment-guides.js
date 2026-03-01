// Investment Guides JavaScript

// Sample investment guides data
const investmentGuides = [
    {
        id: 1,
        title: "Stock Market Basics",
        description: "Learn how the stock market works, how to read stock charts, and basic terminology every investor should know.",
        category: "stocks",
        level: "beginner",
        duration: "30 min",
        icon: "bi bi-graph-up"
    },
    {
        id: 2,
        title: "Mutual Funds Explained",
        description: "Understand different types of mutual funds, their risks and returns, and how to choose the right ones for your portfolio.",
        category: "mutual-funds",
        level: "beginner",
        duration: "25 min",
        icon: "bi bi-pie-chart"
    },
    {
        id: 3,
        title: "Real Estate Investment Strategies",
        description: "Explore various real estate investment approaches from REITs to rental properties and commercial real estate.",
        category: "real-estate",
        level: "intermediate",
        duration: "45 min",
        icon: "bi bi-house"
    },
    {
        id: 4,
        title: "Bond Investment Guide",
        description: "Learn about government and corporate bonds, yield curves, and how to build a fixed income portfolio.",
        category: "bonds",
        level: "intermediate",
        duration: "35 min",
        icon: "bi bi-cash-coin"
    },
    {
        id: 5,
        title: "Cryptocurrency Fundamentals",
        description: "Understand blockchain technology, major cryptocurrencies, and the risks and opportunities in crypto investing.",
        category: "crypto",
        level: "intermediate",
        duration: "40 min",
        icon: "bi bi-currency-bitcoin"
    },
    {
        id: 6,
        title: "Advanced Technical Analysis",
        description: "Master advanced chart patterns, indicators, and trading strategies for active stock traders.",
        category: "stocks",
        level: "advanced",
        duration: "60 min",
        icon: "bi bi-graph-up-arrow"
    },
    {
        id: 7,
        title: "Portfolio Diversification",
        description: "Learn how to properly diversify your investments across different asset classes and geographical regions.",
        category: "mutual-funds",
        level: "intermediate",
        duration: "30 min",
        icon: "bi bi-shuffle"
    },
    {
        id: 8,
        title: "Real Estate Crowdfunding",
        description: "Explore new ways to invest in real estate through online platforms with smaller capital requirements.",
        category: "real-estate",
        level: "intermediate",
        duration: "25 min",
        icon: "bi bi-people"
    }
];

// DOM Elements
const guidesContainer = document.getElementById('guidesContainer');
const filterButtons = document.querySelectorAll('.filter-btn');
const profileCards = document.querySelectorAll('.profile-card');
const calculateBtn = document.getElementById('calculateBtn');
const calculatorResult = document.getElementById('calculatorResult');

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    renderGuides('all');
    
    // Event Listeners
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            filterGuides(filter);
        });
    });
    
    profileCards.forEach(card => {
        card.addEventListener('click', function() {
            const level = this.getAttribute('data-level');
            filterByLevel(level);
            
            // Update active states
            profileCards.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    calculateBtn.addEventListener('click', calculateInvestment);
    
    // Initialize calculator
    calculateInvestment();
});

// Render guides based on filter
function renderGuides(filter) {
    guidesContainer.innerHTML = '';
    
    const filteredGuides = filter === 'all' 
        ? investmentGuides 
        : investmentGuides.filter(guide => guide.category === filter);
    
    if (filteredGuides.length === 0) {
        guidesContainer.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="bi bi-search"></i>
                <h3>No guides found</h3>
                <p>Try selecting a different category or level</p>
            </div>
        `;
        return;
    }
    
    filteredGuides.forEach(guide => {
        const guideCard = document.createElement('div');
        guideCard.className = 'guide-card';
        guideCard.innerHTML = `
            <span class="guide-category">${getCategoryName(guide.category)}</span>
            <div class="guide-icon">
                <i class="${guide.icon}"></i>
            </div>
            <h3 class="guide-title">${guide.title}</h3>
            <p class="guide-description">${guide.description}</p>
            <div class="guide-level">
                <span class="level-badge">${guide.level}</span>
                <span class="level-label">${guide.duration} read</span>
            </div>
        `;
        
        guidesContainer.appendChild(guideCard);
    });
}

// Filter guides based on category
function filterGuides(filter) {
    renderGuides(filter);
    
    // Update active button state
    filterButtons.forEach(btn => {
        if (btn.getAttribute('data-filter') === filter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Scroll to guides section
    document.getElementById('guides-section').scrollIntoView({
        behavior: 'smooth'
    });
}

// Filter guides by investor level
function filterByLevel(level) {
    const filteredGuides = investmentGuides.filter(guide => guide.level === level);
    renderFilteredGuides(filteredGuides, `Showing ${level} level guides`);
}

// Render filtered guides with message
function renderFilteredGuides(guides, message) {
    guidesContainer.innerHTML = '';
    
    if (guides.length === 0) {
        guidesContainer.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="bi bi-search"></i>
                <h3>No guides found</h3>
                <p>${message}</p>
            </div>
        `;
        return;
    }
    
    guides.forEach(guide => {
        const guideCard = document.createElement('div');
        guideCard.className = 'guide-card';
        guideCard.innerHTML = `
            <span class="guide-category">${getCategoryName(guide.category)}</span>
            <div class="guide-icon">
                <i class="${guide.icon}"></i>
            </div>
            <h3 class="guide-title">${guide.title}</h3>
            <p class="guide-description">${guide.description}</p>
            <div class="guide-level">
                <span class="level-badge">${guide.level}</span>
                <span class="level-label">${guide.duration} read</span>
            </div>
        `;
        
        guidesContainer.appendChild(guideCard);
    });
}

// Get category display name
function getCategoryName(category) {
    const categories = {
        'stocks': 'Stocks',
        'mutual-funds': 'Mutual Funds',
        'real-estate': 'Real Estate',
        'bonds': 'Bonds',
        'crypto': 'Cryptocurrency'
    };
    
    return categories[category] || category;
}

// Calculate investment growth
function calculateInvestment() {
    const initialInvestment = parseFloat(document.getElementById('initialInvestment').value) || 0;
    const monthlyContribution = parseFloat(document.getElementById('monthlyContribution').value) || 0;
    const annualReturn = parseFloat(document.getElementById('annualReturn').value) || 0;
    const investmentYears = parseFloat(document.getElementById('investmentYears').value) || 0;
    
    const monthlyRate = annualReturn / 100 / 12;
    const months = investmentYears * 12;
    
    // Calculate future value with compound interest
    let futureValue = initialInvestment * Math.pow(1 + monthlyRate, months);
    
    // Add monthly contributions
    for (let i = 0; i < months; i++) {
        futureValue += monthlyContribution * Math.pow(1 + monthlyRate, months - i - 1);
    }
    
    const totalInvested = initialInvestment + (monthlyContribution * months);
    const interestEarned = futureValue - totalInvested;
    
    document.getElementById('totalInvestment').textContent = Math.round(totalInvested).toLocaleString('en-IN');
    document.getElementById('finalValue').textContent = Math.round(futureValue).toLocaleString('en-IN');
    document.getElementById('interestEarned').textContent = Math.round(interestEarned).toLocaleString('en-IN');
    
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
    document.addEventListener('DOMContentLoaded', renderGuides);
} else {
    renderGuides('all');
}