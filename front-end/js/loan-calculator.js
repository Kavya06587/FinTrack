// loan-calculator.js - Enhanced Loan Calculator with Progress Tracking
document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const loanAmountInput = document.getElementById('loan-amount');
    const loanAmountSlider = document.getElementById('loan-amount-slider');
    const loanAmountValue = document.getElementById('loan-amount-value');
    
    const interestRateInput = document.getElementById('interest-rate');
    const interestRateSlider = document.getElementById('interest-rate-slider');
    const interestRateValue = document.getElementById('interest-rate-value');
    
    const loanTermInput = document.getElementById('loan-term');
    const loanTermSlider = document.getElementById('loan-term-slider');
    const loanTermValue = document.getElementById('loan-term-value');
    
    const calculateBtn = document.getElementById('calculate-btn');
    const calculateBtnAdvanced = document.getElementById('calculate-btn-advanced');
    
    const monthlyPaymentEl = document.getElementById('monthly-payment');
    const totalInterestEl = document.getElementById('total-interest');
    const totalPaymentEl = document.getElementById('total-payment');
    const totalCostDisplayEl = document.getElementById('total-cost-display');
    const principalVisualEl = document.getElementById('principal-visual');
    const interestVisualEl = document.getElementById('interest-visual');
    const principalPercentEl = document.getElementById('principal-percent');
    const interestPercentEl = document.getElementById('interest-percent');
    const payoffTimeEl = document.getElementById('payoff-time');
    const interestRateDisplayEl = document.getElementById('interest-rate-display');
    const amortizationBodyEl = document.getElementById('amortization-body');
    const amortizationSectionEl = document.getElementById('amortization-section');
    
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    const loanListEl = document.getElementById('loan-list');
    const addLoanBtn = document.getElementById('add-loan-btn');
    
    // Modal elements
    const paymentModal = document.getElementById('payment-modal');
    const paymentForm = document.getElementById('payment-form');
    const closeModalBtn = document.querySelector('.close-modal');
    const cancelModalBtn = document.querySelector('.btn-cancel');
    const closeScheduleBtn = document.getElementById('close-schedule');

    // Loan management variables (scope loans per authenticated user)
    function getLoansStorageKey() {
        try {
            const user = JSON.parse(localStorage.getItem('fintrack_user'));
            // prefer database _id, then id, then userId (token payload), then email as fallback
            const idFromUser = user && (user._id || user.id || user.userId || user.email);
            if (idFromUser) return `loans_${idFromUser}`;

            // fallback: try to parse token payload to extract userId
            const token = localStorage.getItem('fintrack_token');
            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    const tid = payload && (payload.userId || payload.userID || payload.user_id || payload.user);
                    if (tid) return `loans_${tid}`;
                } catch (e) { /* ignore */ }
            }
            return 'loans_guest';
        } catch (e) {
            return 'loans_guest';
        }
    }

    let loansKey = getLoansStorageKey();
    let loans = JSON.parse(localStorage.getItem(loansKey)) || [];
    let currentLoanId = null;
    let currentScheduleLoanId = null;

    // Format currency for Indian Rupees
    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    // Format percentage
    function formatPercentage(rate) {
        return `${rate.toFixed(2)}%`;
    }

    // Sync inputs and sliders
    function syncInputAndSlider(input, slider, display, isCurrency = false, isPercentage = false) {
        input.addEventListener('input', function() {
            slider.value = this.value;
            updateDisplay();
        });
        
        slider.addEventListener('input', function() {
            input.value = this.value;
            updateDisplay();
        });
        
        function updateDisplay() {
            if (isCurrency) {
                display.textContent = formatCurrency(parseFloat(input.value));
            } else if (isPercentage) {
                display.textContent = formatPercentage(parseFloat(input.value));
            } else {
                display.textContent = `${input.value} Years`;
            }
        }
        
        // Initial display update
        updateDisplay();
    }

    // Initialize sync between inputs and sliders
    syncInputAndSlider(loanAmountInput, loanAmountSlider, loanAmountValue, true);
    syncInputAndSlider(interestRateInput, interestRateSlider, interestRateValue, false, true);
    syncInputAndSlider(loanTermInput, loanTermSlider, loanTermValue);

    // Tab functionality
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Show active tab content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${tabId}-tab`) {
                    content.classList.add('active');
                }
            });
        });
    });

    // Calculate loan function
    function calculateLoan() {
        const loanAmount = parseFloat(loanAmountInput.value);
        const annualInterestRate = parseFloat(interestRateInput.value) / 100;
        const loanTermYears = parseFloat(loanTermInput.value);
        
        const monthlyInterestRate = annualInterestRate / 12;
        const numberOfPayments = loanTermYears * 12;
        
        // Calculate monthly payment using the formula: P = [r*PV] / [1 - (1+r)^-n]
        const monthlyPayment = (monthlyInterestRate * loanAmount) / (1 - Math.pow(1 + monthlyInterestRate, -numberOfPayments));
        
        const totalPayment = monthlyPayment * numberOfPayments;
        const totalInterest = totalPayment - loanAmount;
        
        // Update results
        monthlyPaymentEl.textContent = formatCurrency(monthlyPayment);
        totalInterestEl.textContent = formatCurrency(totalInterest);
        totalPaymentEl.textContent = formatCurrency(totalPayment);
        totalCostDisplayEl.textContent = formatCurrency(totalPayment);
        payoffTimeEl.textContent = `${loanTermYears} years`;
        interestRateDisplayEl.textContent = formatPercentage(parseFloat(interestRateInput.value));
        
        // Update visualization
        const principalPercent = (loanAmount / totalPayment * 100).toFixed(1);
        const interestPercent = (totalInterest / totalPayment * 100).toFixed(1);
        
        principalVisualEl.style.width = `${principalPercent}%`;
        interestVisualEl.style.width = `${interestPercent}%`;
        
        principalPercentEl.textContent = `${principalPercent}%`;
        interestPercentEl.textContent = `${interestPercent}%`;
    }

    // Save loan function - ENHANCED WITH METRICS
    function saveLoan() {
        const loanName = document.getElementById('loan-name').value || 'Unnamed Loan';
        const loanType = document.getElementById('loan-type').value;
        const loanAmount = parseFloat(loanAmountInput.value);
        const annualInterestRate = parseFloat(interestRateInput.value);
        const loanTermYears = parseFloat(loanTermInput.value);
        const startDate = document.getElementById('start-date').value;
        const extraPayment = parseFloat(document.getElementById('extra-payment').value) || 0;
        
        const monthlyInterestRate = annualInterestRate / 100 / 12;
        const numberOfPayments = loanTermYears * 12;
        const monthlyPayment = (monthlyInterestRate * loanAmount) / (1 - Math.pow(1 + monthlyInterestRate, -numberOfPayments));
        
        const loan = {
            id: currentLoanId || Date.now().toString(),
            name: loanName,
            type: loanType,
            amount: loanAmount,
            interestRate: annualInterestRate,
            term: loanTermYears,
            startDate: startDate,
            extraPayment: extraPayment,
            monthlyPayment: monthlyPayment,
            remainingBalance: loanAmount,
            payments: [],
            createdAt: new Date().toISOString(),
            // Add metrics for progress tracking - FIXED
            metrics: {
                progress: 0,
                totalPaid: 0,
                principalPaid: 0,
                interestPaid: 0,
                status: 'active'
            }
        };
        
        // If editing existing loan, update it, otherwise add new
        const existingIndex = loans.findIndex(l => l.id === currentLoanId);
        if (existingIndex !== -1) {
            loans[existingIndex] = loan;
        } else {
            loans.push(loan);
        }
        
        // Save to localStorage (per-user key)
        loansKey = getLoansStorageKey();
        localStorage.setItem(loansKey, JSON.stringify(loans));
        
        // Notify other components/tabs about loan changes
        try {
            document.dispatchEvent(new CustomEvent('loansUpdated', { 
                detail: { 
                    loans: loans,
                    source: 'loan-calculator',
                    timestamp: new Date().toISOString()
                } 
            }));
            localStorage.setItem('fintrack_loans_updated', Date.now().toString());
            console.log('🔔 Loans updated event dispatched');
        } catch (e) {
            console.warn('Failed to dispatch loansUpdated event', e);
        }
        
        // Reset form and refresh loan list
        resetLoanForm();
        renderLoans();
        
        // Show success message
        if (window.AuthUtils && AuthUtils.showMessage) {
            AuthUtils.showMessage('Loan saved successfully!', 'success');
        } else {
            alert('Loan saved successfully!');
        }
    }

    // Render loans in the loan list - ENHANCED WITH PROGRESS TRACKING
    function renderLoans() {
        if (loans.length === 0) {
            loanListEl.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-bank display-4 text-muted"></i>
                    <p class="mt-3 text-muted">No loans added yet.</p>
                    <p class="text-muted">Use the calculator above to add your first loan.</p>
                </div>
            `;
            return;
        }
        
        loanListEl.innerHTML = '';
        
        loans.forEach(loan => {
            // Calculate metrics for display
            const totalPaid = loan.payments.reduce((sum, payment) => sum + payment.amount, 0);
            const principalPaid = loan.payments.reduce((sum, payment) => sum + payment.principal, 0);
            const interestPaid = loan.payments.reduce((sum, payment) => sum + payment.interest, 0);
            const remainingBalance = loan.amount - principalPaid;
            
            // Calculate progress - FIXED: Use metrics if available, otherwise calculate
            const progress = loan.metrics?.progress !== undefined ? 
                loan.metrics.progress : 
                (loan.amount > 0 ? (principalPaid / loan.amount) * 100 : 0);
            
            // Update loan metrics if not set
            if (!loan.metrics || loan.metrics.progress === undefined) {
                loan.metrics = {
                    progress: progress,
                    totalPaid: totalPaid,
                    principalPaid: principalPaid,
                    interestPaid: interestPaid,
                    status: remainingBalance > 0 ? 'active' : 'paid'
                };
            }
            
            const loanCard = document.createElement('div');
            loanCard.className = 'loan-card';
            loanCard.innerHTML = `
                <div class="loan-header">
                    <div class="loan-title">${loan.name} (${loan.type})</div>
                    <div class="loan-actions">
                        <button class="btn-action btn-pay" data-id="${loan.id}">Add Payment</button>
                        <button class="btn-action btn-view-schedule" data-id="${loan.id}">View Schedule</button>
                        <button class="btn-action btn-delete" data-id="${loan.id}">Delete</button>
                    </div>
                </div>
                <div class="loan-details">
                    <div class="loan-detail-item">
                        <div class="loan-detail-label">Original Amount</div>
                        <div class="loan-detail-value">${formatCurrency(loan.amount)}</div>
                    </div>
                    <div class="loan-detail-item">
                        <div class="loan-detail-label">Remaining Balance</div>
                        <div class="loan-detail-value">${formatCurrency(remainingBalance)}</div>
                    </div>
                    <div class="loan-detail-item">
                        <div class="loan-detail-label">Monthly Payment</div>
                        <div class="loan-detail-value">${formatCurrency(loan.monthlyPayment)}</div>
                    </div>
                    <div class="loan-detail-item">
                        <div class="loan-detail-label">Interest Rate</div>
                        <div class="loan-detail-value">${formatPercentage(loan.interestRate)}</div>
                    </div>
                    <div class="loan-detail-item">
                        <div class="loan-detail-label">Progress</div>
                        <div class="loan-detail-value">${progress.toFixed(1)}%</div>
                    </div>
                    <div class="loan-detail-item">
                        <div class="loan-detail-label">Total Paid</div>
                        <div class="loan-detail-value">${formatCurrency(totalPaid)}</div>
                    </div>
                </div>
                <div class="loan-progress-visual">
                    <div class="progress" style="height: 8px;">
                        <div class="progress-bar bg-success" role="progressbar" 
                             style="width: ${progress}%" 
                             aria-valuenow="${progress}" 
                             aria-valuemin="0" 
                             aria-valuemax="100">
                        </div>
                    </div>
                </div>
                ${loan.payments.length > 0 ? `
                    <div class="payment-history">
                        <h5>Payment History</h5>
                        <table class="payment-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Amount</th>
                                    <th>Principal</th>
                                    <th>Interest</th>
                                    <th>Remaining</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${loan.payments.map(payment => `
                                    <tr>
                                        <td>${new Date(payment.date).toLocaleDateString()}</td>
                                        <td>${formatCurrency(payment.amount)}</td>
                                        <td>${formatCurrency(payment.principal)}</td>
                                        <td>${formatCurrency(payment.interest)}</td>
                                        <td>${formatCurrency(payment.remainingBalance)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : ''}
            `;
            
            loanListEl.appendChild(loanCard);
        });
        
        // Add event listeners for payment and delete buttons
        document.querySelectorAll('.btn-pay').forEach(btn => {
            btn.addEventListener('click', function() {
                const loanId = this.getAttribute('data-id');
                openPaymentModal(loanId);
            });
        });
        
        document.querySelectorAll('.btn-view-schedule').forEach(btn => {
            btn.addEventListener('click', function() {
                const loanId = this.getAttribute('data-id');
                showAmortizationSchedule(loanId);
            });
        });
        
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', function() {
                const loanId = this.getAttribute('data-id');
                deleteLoan(loanId);
            });
        });

        // Save updated loans with metrics
        loansKey = getLoansStorageKey();
        localStorage.setItem(loansKey, JSON.stringify(loans));
    }

    // Open payment modal
    function openPaymentModal(loanId) {
        const loan = loans.find(l => l.id === loanId);
        if (!loan) return;
        
        document.getElementById('payment-loan-id').value = loanId;
        document.getElementById('payment-date').valueAsDate = new Date();
        document.getElementById('payment-amount').value = loan.monthlyPayment.toFixed(0);
        
        paymentModal.classList.add('active');
    }

    // Add payment to a loan - ENHANCED WITH METRICS UPDATES
    function addPayment(loanId, paymentDate, paymentAmount) {
        const loan = loans.find(l => l.id === loanId);
        if (!loan) return;
        
        // Calculate interest and principal portions
        const monthlyInterestRate = loan.interestRate / 100 / 12;
        const interestPayment = loan.remainingBalance * monthlyInterestRate;
        const principalPayment = Math.min(paymentAmount - interestPayment, loan.remainingBalance);
        
        // Update loan balance
        loan.remainingBalance -= principalPayment;

        // Update loan metrics - FIXED
        if (!loan.metrics) {
            loan.metrics = {
                progress: 0,
                totalPaid: 0,
                principalPaid: 0,
                interestPaid: 0,
                status: 'active'
            };
        }
        
        loan.metrics.totalPaid += paymentAmount;
        loan.metrics.principalPaid += principalPayment;
        loan.metrics.interestPaid += interestPayment;
        loan.metrics.progress = (loan.metrics.principalPaid / loan.amount) * 100;
        
        // Update loan status if paid off
        if (loan.remainingBalance <= 0) {
            loan.remainingBalance = 0;
            loan.metrics.status = 'paid';
        }
        
        // Add payment record
        const payment = {
            date: paymentDate,
            amount: paymentAmount,
            principal: principalPayment,
            interest: interestPayment,
            remainingBalance: loan.remainingBalance,
            type: paymentAmount > loan.monthlyPayment ? 'extra' : 'regular'
        };

        if (!loan.payments) {
            loan.payments = [];
        }

        loan.payments.push(payment);
        
        // Save to localStorage (per-user key)
        loansKey = getLoansStorageKey();
        localStorage.setItem(loansKey, JSON.stringify(loans));
        
        // Notify other components/tabs about loan changes
        try {
            document.dispatchEvent(new CustomEvent('loansUpdated', { 
                detail: { 
                    loans: loans,
                    source: 'loan-calculator-payment',
                    timestamp: new Date().toISOString(),
                    updatedLoanId: loanId
                } 
            }));
            localStorage.setItem('fintrack_loans_updated', Date.now().toString());
            console.log('🔔 Payment recorded - loans updated event dispatched');
        } catch (e) {
            console.warn('Failed to dispatch loansUpdated event after payment', e);
        }
        
        // Refresh loan list
        renderLoans();
        
        // If schedule is open for this loan, update it
        if (currentScheduleLoanId === loanId) {
            showAmortizationSchedule(loanId);
        }
        
        if (window.AuthUtils && AuthUtils.showMessage) {
            AuthUtils.showMessage('Payment recorded successfully!', 'success');
        } else {
            alert('Payment recorded successfully!');
        }
    }

    // Show amortization schedule for a loan
    function showAmortizationSchedule(loanId) {
        const loan = loans.find(l => l.id === loanId);
        if (!loan) return;
        
        currentScheduleLoanId = loanId;
        
        // Generate schedule based on actual payments
        let balance = loan.amount;
        let scheduleHTML = '';
        let paymentNumber = 1;
        
        // Get start date
        let currentDate = new Date(loan.startDate + '-01');
        
        // Add rows for actual payments
        loan.payments.forEach(payment => {
            const paymentDate = new Date(payment.date);
            
            scheduleHTML += `
                <tr style="background-color: #e8f5e8;">
                    <td>${paymentNumber}</td>
                    <td>${paymentDate.toLocaleDateString()}</td>
                    <td>${formatCurrency(payment.amount)}</td>
                    <td>${formatCurrency(payment.principal)}</td>
                    <td>${formatCurrency(payment.interest)}</td>
                    <td>${formatCurrency(payment.remainingBalance)}</td>
                    <td><span class="badge bg-success">Paid</span></td>
                </tr>
            `;
            
            balance = payment.remainingBalance;
            paymentNumber++;
            
            // Update current date to be after this payment
            currentDate = new Date(paymentDate);
            currentDate.setMonth(currentDate.getMonth() + 1);
        });
        
        // If loan is not fully paid, show future payments
        if (balance > 0) {
            const monthlyInterestRate = loan.interestRate / 100 / 12;
            const monthlyPayment = loan.monthlyPayment;
            
            while (balance > 0 && paymentNumber <= loan.term * 12) {
                const interestPayment = balance * monthlyInterestRate;
                const principalPayment = Math.min(monthlyPayment - interestPayment, balance);
                const paymentAmount = principalPayment + interestPayment;
                
                balance -= principalPayment;
                
                scheduleHTML += `
                    <tr>
                        <td>${paymentNumber}</td>
                        <td>${currentDate.toLocaleDateString()}</td>
                        <td>${formatCurrency(paymentAmount)}</td>
                        <td>${formatCurrency(principalPayment)}</td>
                        <td>${formatCurrency(interestPayment)}</td>
                        <td>${formatCurrency(Math.max(balance, 0))}</td>
                        <td><span class="badge bg-warning">Pending</span></td>
                    </tr>
                `;
                
                paymentNumber++;
                currentDate.setMonth(currentDate.getMonth() + 1);
                
                // Stop if balance is paid off
                if (balance <= 0) break;
            }
        }
        
        amortizationBodyEl.innerHTML = scheduleHTML;
        amortizationSectionEl.style.display = 'block';
        
        // Scroll to schedule
        amortizationSectionEl.scrollIntoView({ behavior: 'smooth' });
    }

    // Delete a loan
    function deleteLoan(loanId) {
        if (confirm('Are you sure you want to delete this loan? This action cannot be undone.')) {
            loans = loans.filter(l => l.id !== loanId);
            loansKey = getLoansStorageKey();
            localStorage.setItem(loansKey, JSON.stringify(loans));
            
            // Notify other components/tabs about loan changes
            try {
                document.dispatchEvent(new CustomEvent('loansUpdated', { 
                    detail: { 
                        loans: loans,
                        source: 'loan-calculator-delete',
                        timestamp: new Date().toISOString()
                    } 
                }));
                localStorage.setItem('fintrack_loans_updated', Date.now().toString());
            } catch (e) {
                console.warn('Failed to dispatch loansUpdated event after delete', e);
            }
            
            renderLoans();
            
            // If schedule is open for this loan, close it
            if (currentScheduleLoanId === loanId) {
                amortizationSectionEl.style.display = 'none';
                currentScheduleLoanId = null;
            }

            if (window.AuthUtils && AuthUtils.showMessage) {
                AuthUtils.showMessage('Loan deleted successfully!', 'success');
            }
        }
    }

    // Reset loan form
    function resetLoanForm() {
        document.getElementById('loan-name').value = '';
        document.getElementById('loan-type').value = 'personal';
        document.getElementById('extra-payment').value = '0';
        currentLoanId = null;
        
        // Switch to basic tab
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        document.querySelector('[data-tab="basic"]').classList.add('active');
        document.getElementById('basic-tab').classList.add('active');
    }

    // Initialize loan metrics for existing loans (migration)
    function initializeLoanMetrics() {
        let needsUpdate = false;
        
        loans.forEach(loan => {
            if (!loan.metrics || loan.metrics.progress === undefined) {
                const principalPaid = loan.payments.reduce((sum, payment) => sum + (payment.principal || 0), 0);
                const totalPaid = loan.payments.reduce((sum, payment) => sum + payment.amount, 0);
                const interestPaid = loan.payments.reduce((sum, payment) => sum + (payment.interest || 0), 0);
                const progress = loan.amount > 0 ? (principalPaid / loan.amount) * 100 : 0;
                
                loan.metrics = {
                    progress: progress,
                    totalPaid: totalPaid,
                    principalPaid: principalPaid,
                    interestPaid: interestPaid,
                    status: loan.remainingBalance > 0 ? 'active' : 'paid'
                };
                needsUpdate = true;
            }
        });
        
        if (needsUpdate) {
            loansKey = getLoansStorageKey();
            localStorage.setItem(loansKey, JSON.stringify(loans));
            console.log('📊 Loan metrics initialized for existing loans');
        }
    }

    // Debug function to check loan data
    function debugLoans() {
        console.group('🔍 Loan Calculator Debug');
        console.log('Loans Storage Key:', loansKey);
        console.log('Total Loans:', loans.length);
        console.log('Active Loans:', loans.filter(l => l.remainingBalance > 0).length);
        
        loans.forEach((loan, index) => {
            console.log(`Loan ${index + 1}:`, {
                name: loan.name,
                amount: loan.amount,
                remaining: loan.remainingBalance,
                metrics: loan.metrics,
                payments: loan.payments.length
            });
        });
        
        // Check localStorage for other loan keys
        const loanKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key === 'loans' || key.startsWith('loans_'))) {
                loanKeys.push(key);
            }
        }
        console.log('All loan keys in localStorage:', loanKeys);
        console.groupEnd();
    }

    // Add debug button to UI
    function addDebugButton() {
        if (document.getElementById('loanDebugBtn')) return;
        
        const header = document.querySelector('.calculator-header');
        if (!header) return;
        
        const debugBtn = document.createElement('button');
        debugBtn.id = 'loanDebugBtn';
        debugBtn.className = 'btn btn-sm btn-outline-secondary ms-2';
        debugBtn.textContent = 'Debug Loans';
        debugBtn.title = 'Print loan data to console for debugging';
        debugBtn.addEventListener('click', debugLoans);
        
        const subtitle = header.querySelector('.subtitle');
        if (subtitle) {
            subtitle.insertAdjacentElement('afterend', debugBtn);
        }
    }

    // Set current month as default start date
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    document.getElementById('start-date').value = currentMonth;

    // Event listeners
    calculateBtn.addEventListener('click', calculateLoan);
    calculateBtnAdvanced.addEventListener('click', saveLoan);
    addLoanBtn.addEventListener('click', function() {
        // Switch to advanced tab
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        document.querySelector('[data-tab="advanced"]').classList.add('active');
        document.getElementById('advanced-tab').classList.add('active');
        
        // Focus on loan name field
        document.getElementById('loan-name').focus();
    });

    // Modal event listeners
    paymentForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const loanId = document.getElementById('payment-loan-id').value;
        const paymentDate = document.getElementById('payment-date').value;
        const paymentAmount = parseFloat(document.getElementById('payment-amount').value);
        
        if (!paymentDate || !paymentAmount || paymentAmount <= 0) {
            alert('Please enter valid payment details');
            return;
        }
        
        addPayment(loanId, paymentDate, paymentAmount);
        paymentModal.classList.remove('active');
    });
    
    closeModalBtn.addEventListener('click', function() {
        paymentModal.classList.remove('active');
    });
    
    cancelModalBtn.addEventListener('click', function() {
        paymentModal.classList.remove('active');
    });
    
    closeScheduleBtn.addEventListener('click', function() {
        amortizationSectionEl.style.display = 'none';
        currentScheduleLoanId = null;
    });

    // Close modal when clicking outside
    paymentModal.addEventListener('click', function(e) {
        if (e.target === paymentModal) {
            paymentModal.classList.remove('active');
        }
    });

    // Listen for loan updates from other tabs
    window.addEventListener('storage', function(e) {
        if (e.key === 'fintrack_loans_updated' && e.newValue) {
            console.log('🔄 Loans updated in another tab, refreshing...');
            // Reload loans from localStorage
            loansKey = getLoansStorageKey();
            const updatedLoans = JSON.parse(localStorage.getItem(loansKey)) || [];
            if (JSON.stringify(updatedLoans) !== JSON.stringify(loans)) {
                loans = updatedLoans;
                renderLoans();
                console.log('✅ Loans refreshed from another tab');
            }
        }
    });

    // Listen for focus events to refresh data
    window.addEventListener('focus', function() {
        // Check if loans data might have been updated in another tab
        loansKey = getLoansStorageKey();
        const currentLoans = JSON.parse(localStorage.getItem(loansKey)) || [];
        if (JSON.stringify(currentLoans) !== JSON.stringify(loans)) {
            loans = currentLoans;
            renderLoans();
            console.log('✅ Loans refreshed on window focus');
        }
    });

    // Initialize the calculator
    function initializeCalculator() {
        console.log('🚀 Initializing Loan Calculator...');
        
        // Initialize metrics for existing loans
        initializeLoanMetrics();
        
        // Calculate initial loan
        calculateLoan();
        
        // Render existing loans
        renderLoans();
        
        // Add debug button
        addDebugButton();
        
        console.log('✅ Loan Calculator initialized successfully');
        console.log('📊 Total loans loaded:', loans.length);
    }

    // Start the calculator
    initializeCalculator();
});

// Global functions for loan management
function viewLoanDetails(loanId) {
    // This could open a detailed view or scroll to the loan
    const loanElement = document.querySelector(`[data-loan-id="${loanId}"]`);
    if (loanElement) {
        loanElement.scrollIntoView({ behavior: 'smooth' });
    }
}

function exportLoansData() {
    const loansKey = getLoansStorageKey();
    const loans = JSON.parse(localStorage.getItem(loansKey)) || [];
    
    const dataStr = JSON.stringify(loans, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `loans-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    if (window.AuthUtils && AuthUtils.showMessage) {
        AuthUtils.showMessage('Loans data exported successfully!', 'success');
    }
}

// Helper function to get loans storage key (made global for export function)
function getLoansStorageKey() {
    try {
        const user = JSON.parse(localStorage.getItem('fintrack_user'));
        const idFromUser = user && (user._id || user.id || user.userId || user.email);
        if (idFromUser) return `loans_${idFromUser}`;

        const token = localStorage.getItem('fintrack_token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const tid = payload && (payload.userId || payload.userID || payload.user_id || payload.user);
                if (tid) return `loans_${tid}`;
            } catch (e) { /* ignore */ }
        }
        return 'loans_guest';
    } catch (e) {
        return 'loans_guest';
    }
}