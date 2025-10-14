// API Configuration
const API_BASE_URL = 'http://localhost:3001/api';

// Login function - UPDATED to use real API
// Login function - FIXED error handling
async function handleLogin(loginData) {
  try {
    console.log('Sending login request to backend...', loginData);
    
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData),
    });

    const data = await response.json();
    console.log('Login response:', data);
    
    if (!response.ok) {
      // Return the actual backend error message
      return {
        success: false,
        message: data.message || `Login failed with status ${response.status}`
      };
    }
    
    return data;
    
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      message: 'Cannot connect to server. Make sure backend is running on port 3001.'
    };
  }
}
// Register function - UPDATED to use real API
async function handleRegister(registerData) {
  try {
    console.log('Sending registration request to backend...', registerData);
    
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registerData),
    });

    const data = await response.json();
    console.log('Registration response:', data);
    return data;
    
  } catch (error) {
    console.error('Registration error:', error);
    return {
      success: false,
      message: 'Cannot connect to server. Make sure backend is running on port 3001.'
    };
  }
}

// Show message to user
function showMessage(message, type) {
  // Remove existing messages
  const existingMessages = document.querySelectorAll('.success-message, .error-message, .alert-message');
  existingMessages.forEach(msg => msg.remove());
  
  // Create new message element
  const messageEl = document.createElement('div');
  messageEl.className = type === 'success' ? 'success-message' : 'error-message';
  messageEl.textContent = message;
  messageEl.style.display = 'block';
  
  // Add basic styling
  messageEl.style.padding = '12px 16px';
  messageEl.style.margin = '16px 0';
  messageEl.style.borderRadius = '8px';
  messageEl.style.textAlign = 'center';
  messageEl.style.fontWeight = '500';
  messageEl.style.border = '1px solid';
  
  if (type === 'success') {
    messageEl.style.background = 'rgba(76, 175, 80, 0.1)';
    messageEl.style.color = '#2e7d32';
    messageEl.style.borderColor = '#4caf50';
  } else {
    messageEl.style.background = 'rgba(244, 67, 54, 0.1)';
    messageEl.style.color = '#c62828';
    messageEl.style.borderColor = '#f44336';
  }
  
  // Insert before the form
  const authForm = document.querySelector('.auth-form');
  if (authForm) {
    authForm.parentNode.insertBefore(messageEl, authForm);
  }
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (messageEl.parentNode) {
      messageEl.remove();
    }
  }, 5000);
}

// Email validation helper
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Password toggle functionality
function setupPasswordToggles() {
  const toggleLoginPassword = document.querySelector('#toggleLoginPassword');
  const loginPassword = document.querySelector('#loginPassword');
  
  if (toggleLoginPassword && loginPassword) {
    toggleLoginPassword.addEventListener('click', function() {
      const type = loginPassword.getAttribute('type') === 'password' ? 'text' : 'password';
      loginPassword.setAttribute('type', type);
      this.classList.toggle('bi-eye');
      this.classList.toggle('bi-eye-slash');
    });
  }
  
  // For registration page
  const togglePassword = document.querySelector('#togglePassword');
  const toggleConfirmPassword = document.querySelector('#toggleConfirmPassword');
  const password = document.querySelector('#password');
  const confirmPassword = document.querySelector('#confirmPassword');
  
  if (togglePassword && password) {
    togglePassword.addEventListener('click', function() {
      const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
      password.setAttribute('type', type);
      this.classList.toggle('bi-eye');
      this.classList.toggle('bi-eye-slash');
    });
  }
  
  if (toggleConfirmPassword && confirmPassword) {
    toggleConfirmPassword.addEventListener('click', function() {
      const type = confirmPassword.getAttribute('type') === 'password' ? 'text' : 'password';
      confirmPassword.setAttribute('type', type);
      this.classList.toggle('bi-eye');
      this.classList.toggle('bi-eye-slash');
    });
  }
}

// Login form handler
function setupLoginForm() {
  const loginForm = document.getElementById('loginForm');
  
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      const rememberMe = document.getElementById('rememberMe').checked;
      
      // Basic validation
      if (!email || !password) {
        showMessage('Please fill in all required fields.', 'error');
        return;
      }
      
      if (!validateEmail(email)) {
        showMessage('Please enter a valid email address.', 'error');
        return;
      }
      
      // Show loading state
      const submitBtn = this.querySelector('.btn-auth');
      const btnText = submitBtn.querySelector('.btn-text');
      const btnLoader = submitBtn.querySelector('.btn-loader');
      
      if (btnText) btnText.style.display = 'none';
      if (btnLoader) btnLoader.style.display = 'block';
      submitBtn.disabled = true;
      
      try {
        // Use the REAL API call
        const result = await handleLogin({
          email: email,
          password: password,
          rememberMe: rememberMe
        });

        console.log('API Login result:', result);

        if (result.success) {
          showMessage('Login successful! Redirecting...', 'success');
          
          // Store user data
          localStorage.setItem('user', JSON.stringify(result.user));
          if (rememberMe) {
            localStorage.setItem('rememberMe', 'true');
            localStorage.setItem('userEmail', email);
          }
          
          sessionStorage.setItem('isLoggedIn', 'true');
          
          // Redirect after 2 seconds
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 2000);
          
        } else {
          showMessage(result.message, 'error');
        }
      } catch (error) {
        console.error('Login error:', error);
        showMessage('An unexpected error occurred', 'error');
      } finally {
        // Reset button state
        if (btnText) btnText.style.display = 'block';
        if (btnLoader) btnLoader.style.display = 'none';
        submitBtn.disabled = false;
      }
    });
  }
}

// Check if user was remembered
function checkRememberedUser() {
  if (localStorage.getItem('rememberMe') === 'true') {
    const rememberedEmail = localStorage.getItem('userEmail');
    if (rememberedEmail) {
      const emailInput = document.getElementById('loginEmail');
      const rememberCheck = document.getElementById('rememberMe');
      if (emailInput) emailInput.value = rememberedEmail;
      if (rememberCheck) rememberCheck.checked = true;
    }
  }
}

// Create floating particles for background
function createParticles() {
  const particlesContainer = document.getElementById('particles');
  if (!particlesContainer) return;
  
  const particleCount = 30;
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.classList.add('particle');
    
    // Random properties
    const size = Math.random() * 5 + 2;
    const posX = Math.random() * 100;
    const delay = Math.random() * 20;
    const duration = Math.random() * 10 + 20;
    
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${posX}%`;
    particle.style.animationDelay = `${delay}s`;
    particle.style.animationDuration = `${duration}s`;
    
    particlesContainer.appendChild(particle);
  }
}

// Multi-step form functionality for registration page
let currentStep = 1;
const totalSteps = 4;

function updateProgress() {
  const progressFill = document.getElementById('progressFill');
  if (!progressFill) return;
  
  const progressPercentage = ((currentStep - 1) / (totalSteps - 1)) * 100;
  progressFill.style.width = `${progressPercentage}%`;
  
  // Update step indicators
  for (let i = 1; i <= totalSteps; i++) {
    const step = document.getElementById(`step${i}`);
    if (step) {
      if (i < currentStep) {
        step.classList.remove('active');
        step.classList.add('completed');
      } else if (i === currentStep) {
        step.classList.add('active');
        step.classList.remove('completed');
      } else {
        step.classList.remove('active', 'completed');
      }
    }
  }
}

function nextStep(step) {
  // Basic validation
  if (step === 1) {
    const firstName = document.getElementById('firstName')?.value;
    const lastName = document.getElementById('lastName')?.value;
    const email = document.getElementById('email')?.value;
    
    if (!firstName || !lastName || !email) {
      showMessage('Please fill in all required fields', 'error');
      return;
    }
  } else if (step === 2) {
    const passwordValue = document.getElementById('password')?.value;
    const confirmPasswordValue = document.getElementById('confirmPassword')?.value;
    const securityQuestion = document.getElementById('securityQuestion')?.value;
    const securityAnswer = document.getElementById('securityAnswer')?.value;
    
    if (!passwordValue || !confirmPasswordValue || !securityQuestion || !securityAnswer) {
      showMessage('Please fill in all required fields', 'error');
      return;
    }
    
    if (passwordValue !== confirmPasswordValue) {
      showMessage('Passwords do not match!', 'error');
      return;
    }
  }
  
  // Hide current step
  const currentStepEl = document.getElementById(`stepContent${step}`);
  if (currentStepEl) currentStepEl.classList.remove('active');
  
  // Show next step
  currentStep = step + 1;
  const nextStepEl = document.getElementById(`stepContent${currentStep}`);
  if (nextStepEl) nextStepEl.classList.add('active');
  
  // Update progress
  updateProgress();
}

function prevStep(step) {
  // Hide current step
  const currentStepEl = document.getElementById(`stepContent${step}`);
  if (currentStepEl) currentStepEl.classList.remove('active');
  
  // Show previous step
  currentStep = step - 1;
  const prevStepEl = document.getElementById(`stepContent${currentStep}`);
  if (prevStepEl) prevStepEl.classList.add('active');
  
  // Update progress
  updateProgress();
}

function selectGoal(element) {
  // Remove selected class from all goals
  const goals = document.querySelectorAll('.goal-option');
  goals.forEach(goal => goal.classList.remove('selected'));
  
  // Add selected class to clicked goal
  element.classList.add('selected');
}

async function submitForm() {
  const termsCheck = document.getElementById('termsCheck');
  
  if (!termsCheck?.checked) {
    showMessage('You must accept the terms and conditions!', 'error');
    return;
  }
  
  // Show loading state
  const submitBtn = document.querySelector('.btn-submit') || document.querySelector('.btn-auth');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<div class="spinner"></div> Creating Account...';
  submitBtn.disabled = true;
  
  try {
    // Collect all form data
    const formData = {
      firstName: document.getElementById('firstName')?.value,
      lastName: document.getElementById('lastName')?.value,
      email: document.getElementById('email')?.value,
      password: document.getElementById('password')?.value,
      phone: document.getElementById('phone')?.value,
      securityQuestion: document.getElementById('securityQuestion')?.value,
      securityAnswer: document.getElementById('securityAnswer')?.value,
      monthlyIncome: document.getElementById('monthlyIncome')?.value || 0,
      financialGoals: getSelectedGoals(),
      notificationPreferences: getNotificationPreferences(),
      dashboardView: document.getElementById('dashboardView')?.value || 'simple'
    };
    
    console.log('Registration data being sent:', formData);
    
    // ACTUALLY CALL THE REGISTER API
    const result = await handleRegister(formData);
    
    console.log('Registration API response:', result);
    
    if (result.success) {
      // Show success message
      showMessage('Registration successful! Creating your account...', 'success');
      
      // Wait a moment then show success screen
      setTimeout(() => {
        const currentStepEl = document.getElementById(`stepContent${currentStep}`);
        if (currentStepEl) currentStepEl.classList.remove('active');
        
        const successContent = document.getElementById('successContent');
        if (successContent) successContent.classList.add('active');
        
        const progressFill = document.getElementById('progressFill');
        if (progressFill) progressFill.style.width = '100%';
        
        // Mark all steps as completed
        for (let i = 1; i <= totalSteps; i++) {
          const step = document.getElementById(`step${i}`);
          if (step) {
            step.classList.remove('active');
            step.classList.add('completed');
          }
        }
        
        // Store user data automatically if returned
        if (result.data && result.data.user) {
          localStorage.setItem('user', JSON.stringify(result.data.user));
          localStorage.setItem('token', result.data.token);
        }
      }, 1500);
      
    } else {
      showMessage(result.message, 'error');
    }
    
  } catch (error) {
    console.error('Registration error:', error);
    showMessage('Registration failed. Please try again.', 'error');
  } finally {
    // Reset button
    if (submitBtn) {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  }
}

// Add these helper functions (put them before submitForm):
function getSelectedGoals() {
  const goals = [];
  const selectedGoals = document.querySelectorAll('.goal-option.selected');
  selectedGoals.forEach(goal => {
    const goalText = goal.querySelector('h5')?.textContent;
    if (goalText) goals.push(goalText);
  });
  return goals;
}

function getNotificationPreferences() {
  // For now, return default values
  // Later you can read actual checkbox values
  return {
    billReminders: true,
    budgetAlerts: true, 
    investmentUpdates: true,
    marketingNewsletters: false
  };
}

// Initialize everything when page loads
document.addEventListener('DOMContentLoaded', function() {
  console.log('Initializing auth.js...');
  
  // Setup password toggles
  setupPasswordToggles();
  
  // Setup login form if on login page
  setupLoginForm();
  
  // Check remembered user
  checkRememberedUser();
  
  // Create particles
  createParticles();
});