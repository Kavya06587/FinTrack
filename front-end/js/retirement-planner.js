// DOM Elements
const currentAgeInput = document.getElementById('currentAge');
const retirementAgeInput = document.getElementById('retirementAge');
const currentSavingsInput = document.getElementById('currentSavings');
const annualContributionInput = document.getElementById('annualContribution');
const expectedReturnInput = document.getElementById('expectedReturn');
const inflationRateInput = document.getElementById('inflationRate');
const returnValueDisplay = document.getElementById('returnValue');
const inflationValueDisplay = document.getElementById('inflationValue');
const retirementSpendingInput = document.getElementById('retirementSpending');
const socialSecurityInput = document.getElementById('socialSecurity');

const projectedSavingsDisplay = document.getElementById('projectedSavings');
const retirementAgeDisplay = document.getElementById('retirementAgeDisplay');
const annualIncomeDisplay = document.getElementById('annualIncome');
const monthlyIncomeDisplay = document.getElementById('monthlyIncome');
const incomeGapDisplay = document.getElementById('incomeGap');
const statusIndicator = document.getElementById('statusIndicator');
const readinessBar = document.getElementById('readinessBar');
const readinessPercent = document.getElementById('readinessPercent');
const calculationLog = document.getElementById('calculationLog');

const calculateBtn = document.getElementById('calculateBtn');
const resetBtn = document.getElementById('resetBtn');

// Recommendation elements
const contributionRecommendation = document.getElementById('contributionRecommendation');
const investmentRecommendation = document.getElementById('investmentRecommendation');
const retirementRecommendation = document.getElementById('retirementRecommendation');

let savingsChart;

// Initialize the application
function init() {
    updateReturnValue();
    updateInflationValue();
    createChart();
    
    // Event listeners
    expectedReturnInput.addEventListener('input', updateReturnValue);
    inflationRateInput.addEventListener('input', updateInflationValue);
    calculateBtn.addEventListener('click', calculateRetirement);
    resetBtn.addEventListener('click', resetForm);
    
    // Recalculate when any input changes
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('input', calculateRetirement);
    });
    
    // Initial calculation
    calculateRetirement();
}

function updateReturnValue() {
    returnValueDisplay.textContent = `${expectedReturnInput.value}%`;
}

function updateInflationValue() {
    inflationValueDisplay.textContent = `${inflationRateInput.value}%`;
}

function calculateRetirement() {
    // Get input values
    const currentAge = parseInt(currentAgeInput.value) || 0;
    const retirementAge = parseInt(retirementAgeInput.value) || 0;
    const currentSavings = parseFloat(currentSavingsInput.value) || 0;
    const annualContribution = parseFloat(annualContributionInput.value) || 0;
    const expectedReturn = (parseFloat(expectedReturnInput.value) || 0) / 100;
    const inflationRate = (parseFloat(inflationRateInput.value) || 0) / 100;
    const retirementSpending = parseFloat(retirementSpendingInput.value) || 0;
    const socialSecurity = parseFloat(socialSecurityInput.value) || 0;
    
    // Update calculation log
    calculationLog.innerHTML = `<strong>Calculation Log:</strong><br>
    Current Age: ${currentAge}<br>
    Retirement Age: ${retirementAge}<br>
    Current Savings: ${formatCurrency(currentSavings)}<br>
    Annual Contribution: ${formatCurrency(annualContribution)}<br>
    Expected Return: ${(expectedReturn * 100).toFixed(1)}%<br>
    Inflation Rate: ${(inflationRate * 100).toFixed(1)}%<br>
    Retirement Spending: ${formatCurrency(retirementSpending)}<br>
    Pension/Annuity: ${formatCurrency(socialSecurity)}`;
    
    // Validate inputs
    if (retirementAge <= currentAge) {
        calculationLog.innerHTML += `<br><strong>Error:</strong> Retirement age must be greater than current age`;
        return;
    }
    
    if (currentAge < 18 || currentAge > 70) {
        calculationLog.innerHTML += `<br><strong>Error:</strong> Current age must be between 18 and 70`;
        return;
    }
    
    // Calculate years until retirement
    const yearsToRetirement = retirementAge - currentAge;
    
    // Calculate projected savings using compound interest formula
    let projectedSavings = currentSavings;
    for (let i = 0; i < yearsToRetirement; i++) {
        projectedSavings = projectedSavings * (1 + expectedReturn) + annualContribution;
    }
    
    // Adjust retirement spending for inflation
    const futureRetirementSpending = retirementSpending * Math.pow(1 + inflationRate, yearsToRetirement);
    
    // Calculate annual retirement income (4% rule)
    const annualRetirementIncome = projectedSavings * 0.04;
    const totalAnnualIncome = annualRetirementIncome + socialSecurity;
    const totalMonthlyIncome = totalAnnualIncome / 12;
    const incomeGap = futureRetirementSpending - totalAnnualIncome;
    
    // Calculate readiness percentage
    const readiness = Math.min(100, Math.max(0, (totalAnnualIncome / futureRetirementSpending) * 100));
    
    // Update displays
    projectedSavingsDisplay.textContent = formatCurrency(projectedSavings);
    retirementAgeDisplay.textContent = retirementAge;
    annualIncomeDisplay.textContent = formatCurrency(totalAnnualIncome);
    monthlyIncomeDisplay.textContent = formatCurrency(totalMonthlyIncome);
    incomeGapDisplay.textContent = formatCurrency(incomeGap);
    readinessBar.style.width = `${readiness}%`;
    readinessPercent.textContent = `${Math.round(readiness)}%`;
    
    // Update calculation log with results
    calculationLog.innerHTML += `<br><br><strong>Results:</strong><br>
    Years to Retirement: ${yearsToRetirement}<br>
    Projected Savings: ${formatCurrency(projectedSavings)}<br>
    Future Retirement Spending: ${formatCurrency(Math.round(futureRetirementSpending))}<br>
    Annual Retirement Income: ${formatCurrency(Math.round(totalAnnualIncome))}<br>
    Income Gap: ${formatCurrency(Math.round(incomeGap))}<br>
    Readiness: ${Math.round(readiness)}%`;
    
    // Update status indicator
    updateStatusIndicator(incomeGap, readiness);
    
    // Update recommendations
    updateRecommendations(incomeGap, annualContribution, retirementAge, currentAge, projectedSavings);
    
    // Update chart
    updateChart(currentAge, retirementAge, currentSavings, annualContribution, expectedReturn);
}

function updateStatusIndicator(incomeGap, readiness) {
    if (incomeGap <= 0 || readiness >= 100) {
        statusIndicator.innerHTML = '<i class="fas fa-check-circle"></i> On Track';
        statusIndicator.className = "status-indicator status-on-track";
        incomeGapDisplay.style.color = "#2e7d32";
    } else if (readiness >= 80) {
        statusIndicator.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Needs Attention';
        statusIndicator.className = "status-indicator status-needs-attention";
        incomeGapDisplay.style.color = "#ef6c00";
    } else {
        statusIndicator.innerHTML = '<i class="fas fa-exclamation-circle"></i> At Risk';
        statusIndicator.className = "status-indicator status-at-risk";
        incomeGapDisplay.style.color = "#c62828";
    }
}

function updateRecommendations(incomeGap, annualContribution, retirementAge, currentAge, projectedSavings) {
    // Calculate recommended contribution increase
    const recommendedIncrease = Math.ceil(annualContribution * 1.15);
    contributionRecommendation.textContent = `Increase your annual contribution from ${formatCurrency(annualContribution)} to ${formatCurrency(recommendedIncrease)} to reach your retirement goal.`;
    
    // Update investment strategy based on age
    const yearsToRetirement = retirementAge - currentAge;
    let stockPercentage;
    if (yearsToRetirement > 20) {
        stockPercentage = 80;
    } else if (yearsToRetirement > 10) {
        stockPercentage = 60;
    } else {
        stockPercentage = 40;
    }
    const bondPercentage = 100 - stockPercentage;
    investmentRecommendation.textContent = `Consider a ${stockPercentage}/${bondPercentage} stock-to-bond ratio to balance growth potential with risk management.`;
    
    // Update retirement delay recommendation
    const recommendedDelayAge = retirementAge + 2;
    const additionalSavings = projectedSavings * 0.25; // Estimate 25% increase
    retirementRecommendation.textContent = `Consider delaying retirement to age ${recommendedDelayAge} to boost your savings by approximately ${formatCurrency(Math.round(additionalSavings))}.`;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function createChart() {
    const ctx = document.getElementById('savingsChart').getContext('2d');
    savingsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Projected Savings',
                data: [],
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
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return `Savings: ${formatCurrency(context.parsed.y)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Age'
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Savings (₹)'
                    },
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

function updateChart(currentAge, retirementAge, currentSavings, annualContribution, expectedReturn) {
    const yearsToRetirement = retirementAge - currentAge;
    const labels = [];
    const data = [];
    
    let savings = currentSavings;
    
    for (let i = 0; i <= yearsToRetirement; i++) {
        const age = currentAge + i;
        labels.push(age);
        data.push(savings);
        
        // Don't add contribution after retirement age
        if (i < yearsToRetirement) {
            savings = savings * (1 + expectedReturn) + annualContribution;
        }
    }
    
    savingsChart.data.labels = labels;
    savingsChart.data.datasets[0].data = data;
    savingsChart.update();
}

function resetForm() {
    currentAgeInput.value = 40;
    retirementAgeInput.value = 60;
    currentSavingsInput.value = 2500000;
    annualContributionInput.value = 300000;
    expectedReturnInput.value = 10;
    inflationRateInput.value = 5;
    retirementSpendingInput.value = 1200000;
    socialSecurityInput.value = 300000;
    
    updateReturnValue();
    updateInflationValue();
    calculateRetirement();
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', init);