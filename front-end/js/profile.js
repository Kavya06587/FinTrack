// Profile functionality
class Profile {
    constructor() {
        this.user = null;
        this.isEditing = false;
        this.originalData = {};
        this.init();
    }

    init() {
        this.checkAuthentication();
        this.loadUserData();
        this.setupEventListeners();
        this.loadPreferences();
    }

    checkAuthentication() {
        const user = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        
        if (!user || !token) {
            window.location.href = 'login.html';
            return;
        }
        
        this.user = JSON.parse(user);
    }

    loadUserData() {
        if (!this.user) return;

        // Store original data
        this.originalData = { ...this.user };

        // Update form fields
        document.getElementById('firstName').value = this.user.firstName || '';
        document.getElementById('lastName').value = this.user.lastName || '';
        document.getElementById('email').value = this.user.email || '';
        document.getElementById('phone').value = this.user.phone || '';
        document.getElementById('monthlyIncome').value = this.user.monthlyIncome || 0;

        // Update profile summary
        document.getElementById('profileUserName').textContent = 
            `${this.user.firstName} ${this.user.lastName}`;
        document.getElementById('profileUserEmail').textContent = this.user.email;

        // Update security question
        this.updateSecurityQuestion();

        // Update member since
        this.updateMemberSince();

        // Update stats
        this.updateProfileStats();
    }

    updateSecurityQuestion() {
        const questionMap = {
            '1': "What was your first pet's name?",
            '2': "What city were you born in?",
            '3': "What is your mother's maiden name?",
            '4': "What was your first car model?"
        };

        const questionText = questionMap[this.user.securityQuestion] || 'Not set';
        document.getElementById('securityQuestionDisplay').textContent = questionText;
    }

    updateMemberSince() {
        if (this.user.createdAt) {
            const createdDate = new Date(this.user.createdAt);
            const formattedDate = createdDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            document.getElementById('memberSince').textContent = formattedDate;

            // Calculate membership days
            const today = new Date();
            const diffTime = Math.abs(today - createdDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            document.getElementById('memberDays').textContent = diffDays;
        }
    }

    updateProfileStats() {
        // Goals count
        const goalsCount = this.user.financialGoals ? this.user.financialGoals.length : 0;
        document.getElementById('goalsCountProfile').textContent = goalsCount;

        // Formatted income
        const income = this.user.monthlyIncome || 0;
        document.getElementById('incomeProfile').textContent = 
            this.formatCurrency(income);
    }

    loadPreferences() {
        if (!this.user.notificationPreferences) return;

        // Load notification preferences
        const prefs = this.user.notificationPreferences;
        document.getElementById('billReminders').checked = prefs.billReminders || true;
        document.getElementById('budgetAlerts').checked = prefs.budgetAlerts || true;
        document.getElementById('investmentUpdates').checked = prefs.investmentUpdates || true;
        document.getElementById('marketingNewsletters').checked = prefs.marketingNewsletters || false;

        // Load dashboard view preference
        if (this.user.dashboardView) {
            document.getElementById('dashboardView').value = this.user.dashboardView;
        }
    }

    enableEditing() {
        this.isEditing = true;
        
        // Enable form fields
        const form = document.getElementById('profileForm');
        const inputs = form.querySelectorAll('input');
        inputs.forEach(input => {
            input.readOnly = false;
            input.classList.add('editing');
        });

        // Show form actions
        document.getElementById('formActions').style.display = 'flex';

        // Change edit button to save
        const editBtn = document.querySelector('.section-header .btn');
        editBtn.innerHTML = '<i class="bi bi-check me-1"></i>Save';
        editBtn.onclick = () => this.saveProfile();
    }

    cancelEditing() {
        this.isEditing = false;
        
        // Restore original values
        document.getElementById('firstName').value = this.originalData.firstName;
        document.getElementById('lastName').value = this.originalData.lastName;
        document.getElementById('phone').value = this.originalData.phone;
        document.getElementById('monthlyIncome').value = this.originalData.monthlyIncome;

        // Disable form fields
        const form = document.getElementById('profileForm');
        const inputs = form.querySelectorAll('input');
        inputs.forEach(input => {
            input.readOnly = true;
            input.classList.remove('editing');
        });

        // Hide form actions
        document.getElementById('formActions').style.display = 'none';

        // Restore edit button
        const editBtn = document.querySelector('.section-header .btn');
        editBtn.innerHTML = '<i class="bi bi-pencil me-1"></i>Edit';
        editBtn.onclick = () => this.enableEditing();
    }

    async saveProfile() {
        try {
            // Get updated values
            const updatedData = {
                firstName: document.getElementById('firstName').value,
                lastName: document.getElementById('lastName').value,
                phone: document.getElementById('phone').value,
                monthlyIncome: parseFloat(document.getElementById('monthlyIncome').value) || 0,
                notificationPreferences: {
                    billReminders: document.getElementById('billReminders').checked,
                    budgetAlerts: document.getElementById('budgetAlerts').checked,
                    investmentUpdates: document.getElementById('investmentUpdates').checked,
                    marketingNewsletters: document.getElementById('marketingNewsletters').checked
                },
                dashboardView: document.getElementById('dashboardView').value
            };

            // Here you would typically make an API call to update the user
            console.log('Saving profile data:', updatedData);

            // Simulate API call
            await this.simulateSaveProfile(updatedData);

            // Update local storage
            const updatedUser = { ...this.user, ...updatedData };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            this.user = updatedUser;

            // Show success message
            this.showMessage('Profile updated successfully!', 'success');

            // Exit edit mode
            this.cancelEditing();

            // Update the UI
            this.updateProfileStats();

        } catch (error) {
            console.error('Error saving profile:', error);
            this.showMessage('Error updating profile. Please try again.', 'error');
        }
    }

    async simulateSaveProfile(data) {
        // Simulate API delay
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log('Profile saved (simulated):', data);
                resolve(data);
            }, 1000);
        });
    }

    changePassword() {
        const newPassword = prompt('Enter your new password:');
        if (newPassword) {
            // Here you would make an API call to change the password
            console.log('Password change requested');
            this.showMessage('Password change functionality coming soon!', 'info');
        }
    }

    showMessage(message, type) {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.alert-message');
        existingMessages.forEach(msg => msg.remove());

        // Create new message
        const messageEl = document.createElement('div');
        messageEl.className = `alert alert-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'} alert-message`;
        messageEl.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
            animation: slideIn 0.3s ease;
        `;
        messageEl.textContent = message;

        document.body.appendChild(messageEl);

        // Remove after 5 seconds
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.remove();
            }
        }, 5000);
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    setupEventListeners() {
        // Form submission
        document.getElementById('profileForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProfile();
        });

        // Preference changes
        const preferenceInputs = document.querySelectorAll('.preferences-list input');
        preferenceInputs.forEach(input => {
            input.addEventListener('change', () => {
                this.savePreferences();
            });
        });

        // Dashboard view change
        document.getElementById('dashboardView').addEventListener('change', () => {
            this.savePreferences();
        });
    }

    savePreferences() {
        // Auto-save preferences when they change
        if (this.isEditing) return;

        const preferences = {
            billReminders: document.getElementById('billReminders').checked,
            budgetAlerts: document.getElementById('budgetAlerts').checked,
            investmentUpdates: document.getElementById('investmentUpdates').checked,
            marketingNewsletters: document.getElementById('marketingNewsletters').checked
        };

        const dashboardView = document.getElementById('dashboardView').value;

        // Update local storage
        const updatedUser = {
            ...this.user,
            notificationPreferences: preferences,
            dashboardView: dashboardView
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        this.user = updatedUser;

        console.log('Preferences saved:', preferences, dashboardView);
    }
}

// Global functions for HTML onclick attributes
function enableEditing() {
    if (window.profile) {
        window.profile.enableEditing();
    }
}

function cancelEditing() {
    if (window.profile) {
        window.profile.cancelEditing();
    }
}

function changePassword() {
    if (window.profile) {
        window.profile.changePassword();
    }
}

// Initialize profile when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.profile = new Profile();
});

// Add CSS for slide-in animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);