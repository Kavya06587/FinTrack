const API_BASE_URL = 'http://localhost:3001/api';

// Utility functions
class AuthUtils {
    static getToken() {
        return localStorage.getItem('fintrack_token');
    }

    static setToken(token) {
        localStorage.setItem('fintrack_token', token);
    }

    static removeToken() {
        localStorage.removeItem('fintrack_token');
        localStorage.removeItem('fintrack_user');
    }

    static onAuthFailure = null;

    static getUser() {
        const userStr = localStorage.getItem('fintrack_user');
        return userStr ? JSON.parse(userStr) : null;
    }

    static setUser(user) {
        localStorage.setItem('fintrack_user', JSON.stringify(user));
    }

    static isAuthenticated() {
        return !!this.getToken();
    }

    static async apiCall(endpoint, options = {}) {
    const token = this.getToken();
    console.log('🔐 Token from localStorage:', token ? 'Exists' : 'Missing');
    console.log('🔐 Token value:', token);
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        }
    };

    try {
        const url = `${API_BASE_URL}${endpoint}`;
        console.log(`🌐 API Call: ${options.method || 'GET'} ${url}`);
        console.log('📋 Request headers:', defaultOptions.headers);
        
        const response = await fetch(url, {
            ...defaultOptions,
            ...options,
            body: options.body ? JSON.stringify(options.body) : undefined
        });

        console.log('📡 Response status:', response.status);
        console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

        // Handle non-JSON responses
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('❌ Non-JSON response:', text);
            throw new Error('Server returned non-JSON response');
        }

        const data = await response.json();
        console.log('📦 Response data:', data);

        if (!response.ok) {
            const error = new Error(data.message || `HTTP error! status: ${response.status}`);
            error.status = response.status;
            error.details = data;
            throw error;
        }

        return data;

    } catch (error) {
        console.error('❌ API call failed:', error);
        
        // Enhanced error handling
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            throw new Error('Cannot connect to server. Please make sure the backend is running on localhost:3001');
        }
        
        // Handle auth errors
        if (error.status === 401 || error.status === 403) {
            if (this.onAuthFailure) {
                this.onAuthFailure(error);
            }
        }
        
        throw error;
    }
}

    static formatCurrency(amount, currency = 'INR') {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount);
    }

    static formatNumber(amount) {
        if (amount >= 10000000) {
            return '₹' + (amount / 10000000).toFixed(2) + ' Cr';
        } else if (amount >= 100000) {
            return '₹' + (amount / 100000).toFixed(2) + ' L';
        } else if (amount >= 1000) {
            return '₹' + (amount / 1000).toFixed(2) + ' K';
        } else {
            return '₹' + amount.toFixed(2);
        }
    }

    static togglePassword(toggleBtn) {
        if (!toggleBtn) return;
        
        let input = toggleBtn.previousElementSibling;
        if (!input || input.tagName !== 'INPUT') {
            const parent = toggleBtn.parentElement;
            if (parent) {
                input = parent.querySelector('input[type="password"], input[type="text"]');
            }
        }
        
        if (!input) return;

        if (input.type === 'password') {
            input.type = 'text';
            toggleBtn.classList.remove('bi-eye-slash');
            toggleBtn.classList.add('bi-eye');
        } else {
            input.type = 'password';
            toggleBtn.classList.remove('bi-eye');
            toggleBtn.classList.add('bi-eye-slash');
        }
    }

    static showMessage(message, type = 'info') {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.alert-message');
        existingMessages.forEach(msg => msg.remove());

        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.className = `alert-message alert-${type}`;
        messageDiv.innerHTML = `
            <div class="alert-content">
                <span class="alert-text">${message}</span>
                <button class="alert-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        // Add styles if not already added
        if (!document.querySelector('#alert-styles')) {
            const styles = document.createElement('style');
            styles.id = 'alert-styles';
            styles.textContent = `
                .alert-message {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 9999;
                    min-width: 300px;
                    max-width: 500px;
                    animation: slideInRight 0.3s ease;
                }
                .alert-content {
                    padding: 12px 16px;
                    border-radius: 8px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                }
                .alert-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
                .alert-error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
                .alert-warning { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
                .alert-info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
                .alert-close {
                    background: none;
                    border: none;
                    font-size: 18px;
                    cursor: pointer;
                    margin-left: 10px;
                }
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(messageDiv);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentElement) {
                messageDiv.remove();
            }
        }, 5000);
    }
}

// Default global auth-failure handler
if (!AuthUtils.onAuthFailure) {
    AuthUtils.onAuthFailure = function(err) {
        console.warn('Global auth failure handler invoked', err);
        AuthUtils.removeToken();
        AuthUtils.showMessage('Session expired. Please login again.', 'warning');
        setTimeout(() => {
            if (!window.location.pathname.includes('login.html') && !window.location.pathname.includes('index.html')) {
                window.location.href = '../login.html';
            }
        }, 1500);
    };
}

// Auth management
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.registrationManager = null;
        this.init();
    }

    async init() {
        await this.checkAuthState();
        this.setupEventListeners();
        
        if (window.location.pathname.includes('reg.html')) {
            this.registrationManager = new RegistrationManager();
        }
    }

    async checkAuthState() {
        const token = AuthUtils.getToken();
        const user = AuthUtils.getUser();

        if (token && user) {
            try {
                const response = await AuthUtils.apiCall('/auth/verify');
                if (response.success) {
                    this.currentUser = response.user;
                    AuthUtils.setUser(this.currentUser);
                    this.updateUI(true);
                    return true;
                }
            } catch (error) {
                console.error('Token verification failed:', error);
                this.logout();
                return false;
            }
        } else {
            this.updateUI(false);
            return false;
        }
    }

    updateUI(isAuthenticated) {
        // Update navigation based on authentication state
        const authElements = document.querySelectorAll('[data-auth]');
        authElements.forEach(element => {
            const shouldShow = element.getAttribute('data-auth') === 'true' ? isAuthenticated : !isAuthenticated;
            element.style.display = shouldShow ? 'block' : 'none';
        });

        if (isAuthenticated) {
            this.updateUserInfo();
        }
    }

    updateUserInfo() {
        const user = AuthUtils.getUser();
        if (!user) return;

        const userElements = document.querySelectorAll('[data-user]');
        userElements.forEach(element => {
            const property = element.getAttribute('data-user');
            if (property === 'name') {
                element.textContent = `${user.firstName} ${user.lastName}`;
            } else if (property === 'email') {
                element.textContent = user.email;
            } else if (property === 'firstName') {
                element.textContent = user.firstName;
            } else if (property === 'welcome') {
                element.textContent = `Welcome back, ${user.firstName}!`;
            }
        });
    }

    setupEventListeners() {
        // Logout button
        document.addEventListener('click', (e) => {
            if (e.target.closest('#logoutLink') || e.target.closest('.logout-btn')) {
                e.preventDefault();
                this.logout();
            }
        });

        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Password toggles
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('password-toggle')) {
                AuthUtils.togglePassword(e.target);
            }
        });
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const form = event.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            AuthUtils.showMessage('Please enter both email and password', 'error');
            return;
        }

        try {
            // Show loading state
            submitBtn.innerHTML = '<div class="spinner"></div> Signing in...';
            submitBtn.disabled = true;

            const response = await AuthUtils.apiCall('/auth/login', {
                method: 'POST',
                body: { email, password }
            });

            if (response.success) {
                AuthUtils.setToken(response.token);
                AuthUtils.setUser(response.user);
                this.currentUser = response.user;

                AuthUtils.showMessage('Login successful!', 'success');
                this.updateUI(true);

                // Redirect to dashboard
                setTimeout(() => {
                    window.location.href = 'pages/dashboard.html';
                }, 1000);
            }

        } catch (error) {
            AuthUtils.showMessage(error.message || 'Login failed. Please try again.', 'error');
        } finally {
            // Reset loading state
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    logout() {
        AuthUtils.removeToken();
        this.currentUser = null;
        this.updateUI(false);
        
        AuthUtils.showMessage('Logged out successfully', 'info');
        
        setTimeout(() => {
            if (!window.location.pathname.includes('index.html') && !window.location.pathname.includes('login.html')) {
                window.location.href = '../index.html';
            }
        }, 1000);
    }
}

// Registration Manager
class RegistrationManager {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 4;
        this.formData = {};
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateProgress(1);
    }

    setupEventListeners() {
        // Password toggles
        const toggleButtons = document.querySelectorAll('.password-toggle');
        toggleButtons.forEach(btn => {
            btn.addEventListener('click', () => AuthUtils.togglePassword(btn));
        });
    }

    nextStep(step) {
        if (this.validateStep(step)) {
            this.saveStepData(step);
            if (step < this.totalSteps) {
                this.updateProgress(step + 1);
                this.showStep(step + 1);
            } else {
                this.submitForm();
            }
        }
    }

    prevStep(step) {
        if (step > 1) {
            this.updateProgress(step - 1);
            this.showStep(step - 1);
        }
    }

    validateStep(step) {
        switch(step) {
            case 1:
                const firstName = document.getElementById('firstName')?.value;
                const lastName = document.getElementById('lastName')?.value;
                const email = document.getElementById('email')?.value;
                
                if (!firstName || !lastName || !email) {
                    AuthUtils.showMessage('Please fill in all required fields', 'error');
                    return false;
                }
                
                if (!this.isValidEmail(email)) {
                    AuthUtils.showMessage('Please enter a valid email address', 'error');
                    return false;
                }
                return true;
                
            case 2:
                const password = document.getElementById('password')?.value;
                const confirmPassword = document.getElementById('confirmPassword')?.value;
                const securityQuestion = document.getElementById('securityQuestion')?.value;
                const securityAnswer = document.getElementById('securityAnswer')?.value;
                
                if (!password || !confirmPassword || !securityQuestion || !securityAnswer) {
                    AuthUtils.showMessage('Please fill in all required fields', 'error');
                    return false;
                }
                
                if (password.length < 6) {
                    AuthUtils.showMessage('Password must be at least 6 characters long', 'error');
                    return false;
                }
                
                if (password !== confirmPassword) {
                    AuthUtils.showMessage('Passwords do not match', 'error');
                    return false;
                }
                return true;
                
            case 3:
                return true; // Goals are optional
                
            case 4:
                const termsCheck = document.getElementById('termsCheck');
                if (!termsCheck?.checked) {
                    AuthUtils.showMessage('Please agree to the Terms of Service and Privacy Policy', 'error');
                    return false;
                }
                return true;
                
            default:
                return true;
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    saveStepData(step) {
        // Save form data for each step
        switch(step) {
            case 1:
                this.formData.firstName = document.getElementById('firstName')?.value;
                this.formData.lastName = document.getElementById('lastName')?.value;
                this.formData.email = document.getElementById('email')?.value;
                this.formData.phone = document.getElementById('phone')?.value;
                break;
            case 2:
                this.formData.password = document.getElementById('password')?.value;
                this.formData.securityQuestion = document.getElementById('securityQuestion')?.value;
                this.formData.securityAnswer = document.getElementById('securityAnswer')?.value;
                break;
            case 3:
                this.formData.monthlyIncome = document.getElementById('monthlyIncome')?.value || 0;
                break;
        }
    }

    updateProgress(step) {
        this.currentStep = step;
        
        const progressFill = document.getElementById('progressFill');
        if (progressFill) {
            const progressPercentage = ((step - 1) / (this.totalSteps - 1)) * 100;
            progressFill.style.width = `${progressPercentage}%`;
        }
        
        // Update step indicators
        for (let i = 1; i <= this.totalSteps; i++) {
            const stepElement = document.getElementById(`step${i}`);
            if (stepElement) {
                stepElement.classList.toggle('active', i === step);
                stepElement.classList.toggle('completed', i < step);
            }
        }
    }

    showStep(step) {
        // Hide all steps
        for (let i = 1; i <= this.totalSteps + 1; i++) {
            const stepContent = document.getElementById(`stepContent${i}`);
            const successContent = document.getElementById('successContent');
            
            if (stepContent) stepContent.classList.remove('active');
            if (successContent) successContent.classList.remove('active');
        }
        
        // Show current step
        const currentStepContent = document.getElementById(`stepContent${step}`);
        if (currentStepContent) {
            currentStepContent.classList.add('active');
        }
    }

    async submitForm() {
        const submitBtn = document.querySelector('.btn-submit');
        const originalText = submitBtn?.innerHTML;

        try {
            if (submitBtn) {
                submitBtn.innerHTML = '<div class="spinner"></div> Creating Account...';
                submitBtn.disabled = true;
            }

            const registrationData = {
                firstName: this.formData.firstName,
                lastName: this.formData.lastName,
                email: this.formData.email,
                password: this.formData.password,
                securityQuestion: this.formData.securityQuestion,
                securityAnswer: this.formData.securityAnswer,
                monthlyIncome: parseFloat(this.formData.monthlyIncome) || 0,
                phone: this.formData.phone || '',
                currency: 'INR'
            };

            const response = await AuthUtils.apiCall('/auth/register', {
                method: 'POST',
                body: registrationData
            });

            if (response.success) {
                AuthUtils.setToken(response.token);
                AuthUtils.setUser(response.user);
                
                this.showStep(this.totalSteps + 1);
                AuthUtils.showMessage('Account created successfully!', 'success');
                
                setTimeout(() => {
                    window.location.href = 'pages/dashboard.html';
                }, 2000);
            }

        } catch (error) {
            console.error('Registration error:', error);
            AuthUtils.showMessage(error.message || 'Registration failed. Please try again.', 'error');
        } finally {
            if (submitBtn) {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
    window.AuthUtils = AuthUtils;
    
    // Global functions for registration
    window.nextStep = (step) => {
        if (window.authManager.registrationManager) {
            window.authManager.registrationManager.nextStep(step);
        }
    };
    
    window.prevStep = (step) => {
        if (window.authManager.registrationManager) {
            window.authManager.registrationManager.prevStep(step);
        }
    };
    
    window.submitForm = () => {
        if (window.authManager.registrationManager) {
            window.authManager.registrationManager.submitForm();
        }
    };
});

// Add spinner styles
const spinnerStyles = document.createElement('style');
spinnerStyles.textContent = `
    .spinner {
        width: 18px;
        height: 18px;
        border: 2px solid transparent;
        border-top: 2px solid #ffffff;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        display: inline-block;
        margin-right: 8px;
        vertical-align: middle;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(spinnerStyles);