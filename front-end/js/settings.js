// settings.js - Settings Management
class Settings {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        console.log('🔧 Initializing Settings...');
        
        if (!(await this.checkAuthentication())) {
            return;
        }

        await this.loadUserData();
        this.setupEventListeners();
        this.updateUI();
    }

    async checkAuthentication() {
        const token = localStorage.getItem('fintrack_token');
        const user = localStorage.getItem('fintrack_user');
        
        if (!user || !token) {
            this.redirectToLogin();
            return false;
        }
        
        try {
            const response = await this.apiCall('/auth/verify');
            if (response.success) {
                this.currentUser = response.user;
                return true;
            } else {
                this.redirectToLogin();
                return false;
            }
        } catch (error) {
            console.error('Auth verification failed:', error);
            this.redirectToLogin();
            return false;
        }
    }

    redirectToLogin() {
        setTimeout(() => {
            window.location.href = '../login.html';
        }, 1000);
    }

    async loadUserData() {
        try {
            const response = await this.apiCall('/auth/verify');
            if (response.success) {
                this.currentUser = response.user;
                this.populateAccountForm();
                this.populatePreferences();
                this.updateUserInfo();
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            this.showMessage('Error loading user data', 'error');
        }
    }

    populateAccountForm() {
        if (!this.currentUser) return;

        document.getElementById('firstName').value = this.currentUser.firstName || '';
        document.getElementById('lastName').value = this.currentUser.lastName || '';
        document.getElementById('email').value = this.currentUser.email || '';
        document.getElementById('phone').value = this.currentUser.phone || '';
        document.getElementById('monthlyIncome').value = this.currentUser.monthlyIncome || '';
        document.getElementById('currency').value = this.currentUser.currency || 'INR';
    }

    populatePreferences() {
        if (!this.currentUser) return;

        // Dashboard view
        document.getElementById('dashboardView').value = this.currentUser.dashboardView || 'simple';

        // Notification preferences
        const prefs = this.currentUser.notificationPreferences || {};
        document.getElementById('billReminders').checked = prefs.billReminders ?? true;
        document.getElementById('budgetAlerts').checked = prefs.budgetAlerts ?? true;
        document.getElementById('largeTransactions').checked = prefs.largeTransactions ?? true;
        document.getElementById('goalProgress').checked = prefs.goalProgress ?? true;
        document.getElementById('milestoneAlerts').checked = prefs.milestoneAlerts ?? true;
        document.getElementById('loginAlerts').checked = prefs.loginAlerts ?? true;
        document.getElementById('securityUpdates').checked = prefs.securityUpdates ?? true;

        // Additional preferences
        document.getElementById('weeklyReports').checked = prefs.weeklyReports ?? false;
        document.getElementById('monthlyReports').checked = prefs.monthlyReports ?? true;
        document.getElementById('budgetAlerts').checked = prefs.budgetAlerts ?? true;

        // Two-factor authentication
        document.getElementById('twoFactorAuth').checked = this.currentUser.twoFactorEnabled || false;
    }

    updateUserInfo() {
        if (!this.currentUser) return;

        document.getElementById('userName').textContent = `${this.currentUser.firstName} ${this.currentUser.lastName}`;
        document.getElementById('userEmail').textContent = this.currentUser.email;
    }

    setupEventListeners() {
        // Account form
        const accountForm = document.getElementById('accountForm');
        if (accountForm) {
            accountForm.addEventListener('submit', (e) => this.saveAccountSettings(e));
        }

        // Preferences form
        const preferencesForm = document.getElementById('preferencesForm');
        if (preferencesForm) {
            preferencesForm.addEventListener('submit', (e) => this.savePreferences(e));
        }

        // Notifications form
        const notificationsForm = document.getElementById('notificationsForm');
        if (notificationsForm) {
            notificationsForm.addEventListener('submit', (e) => this.saveNotifications(e));
        }

        // Two-factor authentication
        const twoFactorToggle = document.getElementById('twoFactorAuth');
        if (twoFactorToggle) {
            twoFactorToggle.addEventListener('change', (e) => this.toggleTwoFactor(e.target.checked));
        }

        // Logout button
        document.addEventListener('click', (e) => {
            if (e.target.closest('#logoutLink') || e.target.closest('.logout-btn')) {
                e.preventDefault();
                this.logout();
            }
        });
    }

    async saveAccountSettings(event) {
        event.preventDefault();
        
        try {
            const formData = {
                firstName: document.getElementById('firstName').value,
                lastName: document.getElementById('lastName').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                monthlyIncome: parseFloat(document.getElementById('monthlyIncome').value) || 0,
                currency: document.getElementById('currency').value
            };

            const response = await this.apiCall('/profile', {
                method: 'PUT',
                body: formData
            });

            if (response.success) {
                this.currentUser = { ...this.currentUser, ...formData };
                localStorage.setItem('fintrack_user', JSON.stringify(this.currentUser));
                this.updateUserInfo();
                this.showMessage('Account settings saved successfully!', 'success');
            } else {
                throw new Error(response.message || 'Failed to save account settings');
            }
        } catch (error) {
            console.error('Error saving account settings:', error);
            this.showMessage(error.message || 'Error saving account settings', 'error');
        }
    }

    async savePreferences(event) {
        event.preventDefault();
        
        try {
            const formData = {
                dashboardView: document.getElementById('dashboardView').value,
                notificationPreferences: {
                    weeklyReports: document.getElementById('weeklyReports').checked,
                    monthlyReports: document.getElementById('monthlyReports').checked,
                    budgetAlerts: document.getElementById('budgetAlerts').checked
                }
            };

            const response = await this.apiCall('/profile', {
                method: 'PUT',
                body: formData
            });

            if (response.success) {
                this.currentUser = { ...this.currentUser, ...formData };
                localStorage.setItem('fintrack_user', JSON.stringify(this.currentUser));
                this.showMessage('Preferences saved successfully!', 'success');
            } else {
                throw new Error(response.message || 'Failed to save preferences');
            }
        } catch (error) {
            console.error('Error saving preferences:', error);
            this.showMessage('Error saving preferences', 'error');
        }
    }

    async saveNotifications(event) {
        event.preventDefault();
        
        try {
            const notificationPreferences = {
                billReminders: document.getElementById('billReminders').checked,
                budgetAlerts: document.getElementById('budgetAlerts').checked,
                largeTransactions: document.getElementById('largeTransactions').checked,
                goalProgress: document.getElementById('goalProgress').checked,
                milestoneAlerts: document.getElementById('milestoneAlerts').checked,
                loginAlerts: document.getElementById('loginAlerts').checked,
                securityUpdates: document.getElementById('securityUpdates').checked
            };

            const response = await this.apiCall('/profile', {
                method: 'PUT',
                body: { notificationPreferences }
            });

            if (response.success) {
                this.currentUser.notificationPreferences = notificationPreferences;
                localStorage.setItem('fintrack_user', JSON.stringify(this.currentUser));
                this.showMessage('Notification settings saved!', 'success');
            } else {
                throw new Error(response.message || 'Failed to save notification settings');
            }
        } catch (error) {
            console.error('Error saving notification settings:', error);
            this.showMessage('Error saving notification settings', 'error');
        }
    }

    async toggleTwoFactor(enabled) {
        try {
            const response = await this.apiCall('/profile/two-factor', {
                method: 'PUT',
                body: { enabled }
            });

            if (response.success) {
                this.currentUser.twoFactorEnabled = enabled;
                localStorage.setItem('fintrack_user', JSON.stringify(this.currentUser));
                this.showMessage(
                    `Two-factor authentication ${enabled ? 'enabled' : 'disabled'}`,
                    'success'
                );
            } else {
                throw new Error(response.message || 'Failed to update two-factor authentication');
            }
        } catch (error) {
            console.error('Error updating two-factor authentication:', error);
            this.showMessage('Error updating two-factor authentication', 'error');
            
            // Revert the toggle
            document.getElementById('twoFactorAuth').checked = !enabled;
        }
    }

    updateUI() {
        // Update any dynamic UI elements
        this.updateUserInfo();
    }

    async apiCall(endpoint, options = {}) {
        const token = localStorage.getItem('fintrack_token');
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...options.headers
            }
        };

        try {
            const url = `http://localhost:3001/api${endpoint}`;
            const response = await fetch(url, {
                ...defaultOptions,
                ...options,
                body: options.body ? JSON.stringify(options.body) : undefined
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    }

    showMessage(message, type = 'info') {
        if (window.AuthUtils && window.AuthUtils.showMessage) {
            window.AuthUtils.showMessage(message, type);
        } else {
            // Fallback notification
            const alertClass = type === 'error' ? 'alert-danger' : 
                             type === 'success' ? 'alert-success' : 
                             type === 'warning' ? 'alert-warning' : 'alert-info';
            
            const alertDiv = document.createElement('div');
            alertDiv.className = `alert ${alertClass} alert-dismissible fade show position-fixed`;
            alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
            alertDiv.innerHTML = `
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            
            document.body.appendChild(alertDiv);
            
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.parentNode.removeChild(alertDiv);
                }
            }, 5000);
        }
    }

    logout() {
        localStorage.removeItem('fintrack_token');
        localStorage.removeItem('fintrack_user');
        
        this.showMessage('Logged out successfully', 'info');
        
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 1000);
    }
}

// Global functions for HTML onclick handlers
function resetAccountForm() {
    if (window.settings) {
        window.settings.populateAccountForm();
        window.settings.showMessage('Form reset to saved values', 'info');
    }
}

function saveNewPassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        window.settings.showMessage('Please fill in all fields', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        window.settings.showMessage('New passwords do not match', 'error');
        return;
    }
    
    if (newPassword.length < 8) {
        window.settings.showMessage('Password must be at least 8 characters long', 'error');
        return;
    }
    
    window.settings.apiCall('/auth/change-password', {
        method: 'PUT',
        body: { currentPassword, newPassword }
    })
    .then(response => {
        if (response.success) {
            window.settings.showMessage('Password changed successfully!', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'));
            modal.hide();
            document.getElementById('changePasswordForm').reset();
        } else {
            throw new Error(response.message || 'Failed to change password');
        }
    })
    .catch(error => {
        window.settings.showMessage(error.message || 'Error changing password', 'error');
    });
}

function viewSessions() {
    window.settings.showMessage('Session management feature coming soon!', 'info');
}

function viewLoginHistory() {
    window.settings.showMessage('Login history feature coming soon!', 'info');
}

function exportData(format) {
    window.settings.showMessage(`Exporting data as ${format.toUpperCase()}...`, 'info');
    // Implementation would depend on your backend API
}

function createBackup() {
    window.settings.showMessage('Creating backup...', 'info');
    // Implementation would depend on your backend API
}

function deleteAccount() {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently lost.')) {
        window.settings.showMessage('Account deletion feature coming soon!', 'info');
    }
}

// Initialize settings when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.settings = new Settings();
});