// profile.js
class Profile {
    constructor() {
        this.user = null;
        this.isEditing = false;
        this.originalData = {};
        this.init();
    }

    async init() {
        console.log('🔧 Initializing Profile...');
        
        if (!(await this.checkAuthentication())) {
            return;
        }

        await this.loadUserData();
        this.setupEventListeners();
        this.loadPreferences();
        this.loadGoalsProgress();
        this.loadActivityLog();
    }

    async checkAuthentication() {
        const token = localStorage.getItem('fintrack_token');
        const user = localStorage.getItem('fintrack_user');
        
        if (!user || !token) {
            this.redirectToLogin();
            return false;
        }
        
        try {
            // Verify token with backend
            const response = await this.apiCall('/auth/verify');
            if (response.success) {
                this.user = response.user;
                localStorage.setItem('fintrack_user', JSON.stringify(response.user));
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
            // Get fresh user data from backend
            const response = await this.apiCall('/auth/verify');
            if (response.success) {
                this.user = response.user;
                this.originalData = { ...this.user };
                this.updateFormFields();
                this.updateProfileSummary();
                this.updateSecuritySettings();
                this.updateMemberInfo();
                this.updateProfileStats();
                this.loadProfilePicture();
            } else {
                throw new Error('Failed to load user data');
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            this.showMessage('Error loading profile data', 'error');
        }
    }

    updateFormFields() {
        if (!this.user) return;

        this.setInputValue('firstName', this.user.firstName || '');
        this.setInputValue('lastName', this.user.lastName || '');
        this.setInputValue('email', this.user.email || '');
        this.setInputValue('phone', this.user.phone || '');
        this.setInputValue('monthlyIncome', this.user.monthlyIncome || 0);
    }

    updateProfileSummary() {
        if (!this.user) return;

        this.setTextContent('profileUserName', `${this.user.firstName} ${this.user.lastName}`);
        this.setTextContent('profileUserEmail', this.user.email || 'No email');
        
        // Update account status
        const statusBadge = document.getElementById('accountStatusBadge');
        if (statusBadge) {
            if (this.user.verified) {
                statusBadge.textContent = 'Verified';
                statusBadge.className = 'badge bg-success';
            } else {
                statusBadge.textContent = 'Unverified';
                statusBadge.className = 'badge bg-warning';
            }
        }
    }

    updateSecuritySettings() {
        if (!this.user) return;

        // Security question display
        const questionText = this.user.securityQuestion || 'Security question not set';
        this.setTextContent('securityQuestionDisplay', questionText);
        
        // Password last changed - you might want to add this field to your user model
        this.setTextContent('passwordLastChanged', 'Recently');
        
        // Update verification status
        const verificationStatus = document.getElementById('verificationStatus');
        if (verificationStatus) {
            verificationStatus.textContent = this.user.verified ? 
                'Your account is verified' : 'Your account is not verified';
        }
        
        // Set two-factor authentication toggle
        const twoFactorToggle = document.getElementById('twoFactorAuth');
        if (twoFactorToggle) {
            twoFactorToggle.checked = this.user.twoFactorEnabled || false;
        }
    }

    updateMemberInfo() {
        if (!this.user || !this.user.createdAt) {
            this.setTextContent('memberSince', 'Recent');
            this.setTextContent('memberDays', '1');
            return;
        }

        const createdDate = new Date(this.user.createdAt);
        const formattedDate = createdDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        this.setTextContent('memberSince', formattedDate);

        const today = new Date();
        const diffTime = Math.abs(today - createdDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        this.setTextContent('memberDays', diffDays.toString());
    }

    updateProfileStats() {
        if (!this.user) return;

        const goalsCount = this.user.financialGoals ? this.user.financialGoals.length : 0;
        this.setTextContent('goalsCountProfile', goalsCount.toString());
        this.setTextContent('incomeProfile', this.formatCurrency(this.user.monthlyIncome || 0));
    }

    setInputValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) element.value = value;
    }

    setTextContent(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) element.textContent = value;
    }

    loadPreferences() {
        if (!this.user || !this.user.notificationPreferences) return;

        const prefs = this.user.notificationPreferences;
        this.setCheckbox('billReminders', prefs.billReminders ?? true);
        this.setCheckbox('budgetAlerts', prefs.budgetAlerts ?? true);
        this.setCheckbox('investmentUpdates', prefs.investmentUpdates ?? true);
        this.setCheckbox('marketingNewsletters', prefs.marketingNewsletters ?? false);

        if (this.user.dashboardView) {
            this.setSelectValue('dashboardView', this.user.dashboardView);
        }
    }

    setCheckbox(id, value) {
        const element = document.getElementById(id);
        if (element) element.checked = Boolean(value);
    }

    setSelectValue(id, value) {
        const element = document.getElementById(id);
        if (element) element.value = value;
    }

    setupEventListeners() {
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveProfile();
            });
        }

        const preferenceInputs = document.querySelectorAll('.preferences-list input');
        preferenceInputs.forEach(input => {
            input.addEventListener('change', () => {
                this.savePreferences();
            });
        });

        const dashboardView = document.getElementById('dashboardView');
        if (dashboardView) {
            dashboardView.addEventListener('change', () => {
                this.savePreferences();
            });
        }

        // Two-factor authentication toggle
        const twoFactorToggle = document.getElementById('twoFactorAuth');
        if (twoFactorToggle) {
            twoFactorToggle.addEventListener('change', () => {
                this.toggleTwoFactorAuth(twoFactorToggle.checked);
            });
        }

        // Account verification button
        const verifyAccountBtn = document.getElementById('verifyAccountBtn');
        if (verifyAccountBtn) {
            verifyAccountBtn.addEventListener('click', () => {
                this.verifyAccount();
            });
        }

        // Profile picture upload
        const avatarUpload = document.getElementById('avatarUpload');
        if (avatarUpload) {
            avatarUpload.addEventListener('change', (e) => {
                this.handleProfilePictureUpload(e.target.files[0]);
            });
        }
    }

    enableEditing() {
        this.isEditing = true;
        
        const form = document.getElementById('profileForm');
        const inputs = form.querySelectorAll('input');
        inputs.forEach(input => {
            if (input.id !== 'email') {
                input.readOnly = false;
                input.classList.add('editing');
            }
        });

        const formActions = document.getElementById('formActions');
        if (formActions) formActions.style.display = 'flex';
    }

    cancelEditing() {
        this.isEditing = false;
        
        // Restore original data
        this.setInputValue('firstName', this.originalData.firstName);
        this.setInputValue('lastName', this.originalData.lastName);
        this.setInputValue('phone', this.originalData.phone);
        this.setInputValue('monthlyIncome', this.originalData.monthlyIncome);

        const form = document.getElementById('profileForm');
        const inputs = form.querySelectorAll('input');
        inputs.forEach(input => {
            input.readOnly = true;
            input.classList.remove('editing');
        });

        const formActions = document.getElementById('formActions');
        if (formActions) formActions.style.display = 'none';
    }

    async saveProfile() {
        try {
            const updatedData = {
                firstName: document.getElementById('firstName').value,
                lastName: document.getElementById('lastName').value,
                phone: document.getElementById('phone').value,
                monthlyIncome: parseFloat(document.getElementById('monthlyIncome').value) || 0
            };

            const response = await this.apiCall('/profile', {
                method: 'PUT',
                body: updatedData
            });

            if (response.success) {
                // Update local user data
                this.user = { ...this.user, ...updatedData };
                this.originalData = { ...this.user };
                localStorage.setItem('fintrack_user', JSON.stringify(this.user));

                this.showMessage('Profile updated successfully!', 'success');
                this.cancelEditing();
                this.updateProfileStats();
                this.updateProfileSummary();
            } else {
                throw new Error(response.message || 'Failed to update profile');
            }

        } catch (error) {
            console.error('Error updating profile:', error);
            this.showMessage(error.message || 'Error updating profile.', 'error');
        }
    }

    async savePreferences() {
        try {
            const preferences = {
                billReminders: document.getElementById('billReminders').checked,
                budgetAlerts: document.getElementById('budgetAlerts').checked,
                investmentUpdates: document.getElementById('investmentUpdates').checked,
                marketingNewsletters: document.getElementById('marketingNewsletters').checked
            };

            const dashboardView = document.getElementById('dashboardView').value;

            const response = await this.apiCall('/profile', {
                method: 'PUT',
                body: {
                    notificationPreferences: preferences,
                    dashboardView: dashboardView
                }
            });

            if (response.success) {
                // Update local user data
                this.user = {
                    ...this.user,
                    notificationPreferences: preferences,
                    dashboardView: dashboardView
                };
                localStorage.setItem('fintrack_user', JSON.stringify(this.user));

                this.showMessage('Preferences saved!', 'success');
            } else {
                throw new Error(response.message || 'Failed to save preferences');
            }
        } catch (error) {
            console.error('Error saving preferences:', error);
            this.showMessage('Error saving preferences', 'error');
        }
    }

    async toggleTwoFactorAuth(enabled) {
        try {
            const response = await this.apiCall('/profile/two-factor', {
                method: 'PUT',
                body: { enabled }
            });

            if (response.success) {
                this.user.twoFactorEnabled = enabled;
                localStorage.setItem('fintrack_user', JSON.stringify(this.user));
                
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
            const toggle = document.getElementById('twoFactorAuth');
            if (toggle) {
                toggle.checked = !enabled;
            }
        }
    }

    async verifyAccount() {
        try {
            // Show loading state
            const verifyBtn = document.getElementById('verifyAccountBtn');
            const originalText = verifyBtn.innerHTML;
            verifyBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Verifying...';
            verifyBtn.disabled = true;
            
            // Simulate verification process (you'll need to implement this in backend)
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // For now, just update locally
            this.user.verified = true;
            localStorage.setItem('fintrack_user', JSON.stringify(this.user));
            
            this.updateProfileSummary();
            this.updateSecuritySettings();
            
            this.showMessage('Account verified successfully!', 'success');
            
        } catch (error) {
            console.error('Error verifying account:', error);
            this.showMessage('Error verifying account', 'error');
        } finally {
            // Reset button state
            const verifyBtn = document.getElementById('verifyAccountBtn');
            if (verifyBtn) {
                verifyBtn.innerHTML = 'Verify Account';
                verifyBtn.disabled = false;
            }
        }
    }

    loadProfilePicture() {
        const profileAvatar = document.getElementById('profileAvatar');
        if (!profileAvatar) return;
        
        if (this.user.profilePicture) {
            profileAvatar.innerHTML = `<img src="${this.user.profilePicture}" alt="Profile Picture" class="profile-picture">`;
        } else {
            // Create initials avatar
            const initials = this.getInitials(this.user.firstName, this.user.lastName);
            profileAvatar.innerHTML = `<div class="initials-avatar">${initials}</div>`;
        }
    }

    getInitials(firstName, lastName) {
        const first = firstName ? firstName.charAt(0).toUpperCase() : '';
        const last = lastName ? lastName.charAt(0).toUpperCase() : '';
        return first + last;
    }

    handleProfilePictureUpload(file) {
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            this.showMessage('Please select an image file', 'error');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            this.showMessage('Image size should be less than 5MB', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                // Upload to backend
                const response = await this.apiCall('/profile/picture', {
                    method: 'PUT',
                    body: { profilePicture: e.target.result }
                });

                if (response.success) {
                    this.user.profilePicture = e.target.result;
                    localStorage.setItem('fintrack_user', JSON.stringify(this.user));
                    
                    this.loadProfilePicture();
                    this.showMessage('Profile picture updated!', 'success');
                } else {
                    throw new Error(response.message || 'Failed to update profile picture');
                }
            } catch (error) {
                console.error('Error uploading profile picture:', error);
                this.showMessage('Error updating profile picture', 'error');
            }
        };
        
        reader.readAsDataURL(file);
        
        // Reset the file input
        document.getElementById('avatarUpload').value = '';
    }

    async loadGoalsProgress() {
        try {
            const response = await this.apiCall('/goals');
            
            if (response.success) {
                this.renderGoalsProgress(response.goals || []);
            } else {
                throw new Error('Failed to load goals');
            }
            
        } catch (error) {
            console.error('Error loading goals:', error);
            document.getElementById('goalsProgressContainer').innerHTML = 
                '<p class="text-muted text-center">Error loading goals. Please try again.</p>';
        }
    }

    renderGoalsProgress(goals) {
        const container = document.getElementById('goalsProgressContainer');
        if (!container) return;
        
        if (goals.length === 0) {
            container.innerHTML = '<p class="text-muted text-center">No financial goals set yet.</p>';
            return;
        }
        
        let html = '';
        goals.forEach(goal => {
            const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
            const progressClass = progress >= 100 ? 'bg-success' : 
                                progress >= 75 ? 'bg-primary' : 
                                progress >= 50 ? 'bg-info' : 
                                progress >= 25 ? 'bg-warning' : 'bg-danger';
            
            html += `
                <div class="goal-item">
                    <div class="goal-header">
                        <h6 class="goal-title">${goal.title}</h6>
                        <span class="goal-amount">${this.formatCurrency(goal.currentAmount)} / ${this.formatCurrency(goal.targetAmount)}</span>
                    </div>
                    <div class="goal-progress">
                        <div class="progress">
                            <div class="progress-bar ${progressClass}" role="progressbar" 
                                 style="width: ${progress}%" 
                                 aria-valuenow="${progress}" 
                                 aria-valuemin="0" 
                                 aria-valuemax="100">
                            </div>
                        </div>
                    </div>
                    <div class="goal-meta">
                        <span>${progress.toFixed(1)}% Complete</span>
                        <span>Due: ${new Date(goal.deadline).toLocaleDateString()}</span>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    async loadActivityLog() {
        try {
            // This would need to be implemented in your backend
            // For now, we'll use sample data
            const activities = [
                { 
                    id: 1, 
                    type: 'login', 
                    title: 'Successful Login', 
                    description: 'You logged in from your device',
                    time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                    icon: 'bi-box-arrow-in-right'
                },
                { 
                    id: 2, 
                    type: 'profile_update', 
                    title: 'Profile Updated', 
                    description: 'You updated your personal information',
                    time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                    icon: 'bi-person-check'
                }
            ];
            
            this.renderActivityLog(activities);
            
        } catch (error) {
            console.error('Error loading activity log:', error);
            document.getElementById('activityLogContainer').innerHTML = 
                '<p class="text-muted text-center">Error loading activity log. Please try again.</p>';
        }
    }

    renderActivityLog(activities) {
        const container = document.getElementById('activityLogContainer');
        if (!container) return;
        
        if (activities.length === 0) {
            container.innerHTML = '<p class="text-muted text-center">No recent activity.</p>';
            return;
        }
        
        let html = '';
        activities.forEach(activity => {
            const timeAgo = this.getTimeAgo(activity.time);
            
            html += `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="${activity.icon}"></i>
                    </div>
                    <div class="activity-content">
                        <h6 class="activity-title">${activity.title}</h6>
                        <p class="activity-description">${activity.description}</p>
                        <div class="activity-time">${timeAgo}</div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    getTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        
        return date.toLocaleDateString();
    }

    formatCurrency(amount) {
        // Format using Indian Rupee with Indian numbering system when possible
        try {
            return new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }).format(amount);
        } catch (e) {
            // Fallback to simple rupee prefix
            return `₹${Number(amount).toFixed(2)}`;
        }
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
}

// Global functions for HTML onclick
function enableEditing() {
    if (window.profile) window.profile.enableEditing();
}

function cancelEditing() {
    if (window.profile) window.profile.cancelEditing();
}

function changePassword() {
    // Show the change password modal
    const modal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
    modal.show();
}

async function saveNewPassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        window.profile.showMessage('Please fill in all fields', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        window.profile.showMessage('New passwords do not match', 'error');
        return;
    }
    
    if (newPassword.length < 8) {
        window.profile.showMessage('Password must be at least 8 characters long', 'error');
        return;
    }
    
    try {
        const response = await window.profile.apiCall('/auth/change-password', {
            method: 'PUT',
            body: { currentPassword, newPassword }
        });

        if (response.success) {
            window.profile.showMessage('Password changed successfully!', 'success');
            
            // Close modal and reset form
            const modal = bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'));
            modal.hide();
            document.getElementById('changePasswordForm').reset();
        } else {
            throw new Error(response.message || 'Failed to change password');
        }
    } catch (error) {
        window.profile.showMessage(error.message || 'Error changing password', 'error');
    }
}

function changeProfilePicture() {
    document.getElementById('avatarUpload').click();
}

function removeProfilePicture() {
    if (window.profile) {
        window.profile.handleProfilePictureRemove();
    }
}

function exportUserData() {
    if (window.profile && window.profile.user) {
        const dataStr = JSON.stringify(window.profile.user, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `fintrack-data-${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        window.profile.showMessage('Data exported successfully!', 'success');
    }
}

function deleteAccount() {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        // This would need to be implemented in your backend
        window.profile.showMessage('Account deletion feature coming soon!', 'info');
    }
}

// Initialize profile
document.addEventListener('DOMContentLoaded', function() {
    window.profile = new Profile();
});