document.addEventListener('DOMContentLoaded', function() {
  // Create animated particles
  createParticles();
  
  // Password toggle functionality
  const togglePassword = document.querySelector('#togglePassword');
  const toggleConfirmPassword = document.querySelector('#toggleConfirmPassword');
  const password = document.querySelector('#password');
  const confirmPassword = document.querySelector('#confirmPassword');
  
  if (togglePassword) {
    togglePassword.addEventListener('click', function() {
      // Toggle the type attribute
      const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
      password.setAttribute('type', type);
      
      // Toggle the icon
      this.classList.toggle('bi-eye');
      this.classList.toggle('bi-eye-slash');
    });
  }
  
  if (toggleConfirmPassword) {
    toggleConfirmPassword.addEventListener('click', function() {
      // Toggle the type attribute
      const type = confirmPassword.getAttribute('type') === 'password' ? 'text' : 'password';
      confirmPassword.setAttribute('type', type);
      
      // Toggle the icon
      this.classList.toggle('bi-eye');
      this.classList.toggle('bi-eye-slash');
    });
  }
});

// Create floating particles for background
function createParticles() {
  const particlesContainer = document.getElementById('particles');
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

// Multi-step form functionality
let currentStep = 1;
const totalSteps = 4;

function updateProgress() {
  const progressFill = document.getElementById('progressFill');
  const progressPercentage = ((currentStep - 1) / (totalSteps - 1)) * 100;
  progressFill.style.width = `${progressPercentage}%`;
  
  // Update step indicators
  for (let i = 1; i <= totalSteps; i++) {
    const step = document.getElementById(`step${i}`);
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

function nextStep(step) {
  // Basic validation
  if (step === 1) {
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('email').value;
    
    if (!firstName || !lastName || !email) {
      alert('Please fill in all required fields');
      return;
    }
  } else if (step === 2) {
    const passwordValue = document.getElementById('password').value;
    const confirmPasswordValue = document.getElementById('confirmPassword').value;
    const securityQuestion = document.getElementById('securityQuestion').value;
    const securityAnswer = document.getElementById('securityAnswer').value;
    
    if (!passwordValue || !confirmPasswordValue || !securityQuestion || !securityAnswer) {
      alert('Please fill in all required fields');
      return;
    }
    
    if (passwordValue !== confirmPasswordValue) {
      alert('Passwords do not match!');
      return;
    }
  }
  
  // Hide current step
  document.getElementById(`stepContent${step}`).classList.remove('active');
  
  // Show next step
  currentStep = step + 1;
  document.getElementById(`stepContent${currentStep}`).classList.add('active');
  
  // Update progress
  updateProgress();
}

function prevStep(step) {
  // Hide current step
  document.getElementById(`stepContent${step}`).classList.remove('active');
  
  // Show previous step
  currentStep = step - 1;
  document.getElementById(`stepContent${currentStep}`).classList.add('active');
  
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

function submitForm() {
  const termsCheck = document.getElementById('termsCheck');
  
  if (!termsCheck.checked) {
    alert('You must accept the terms and conditions!');
    return;
  }
  
  // Hide current step
  document.getElementById(`stepContent${currentStep}`).classList.remove('active');
  
  // Show success message
  document.getElementById('successContent').classList.add('active');
  
  // Update progress to complete
  const progressFill = document.getElementById('progressFill');
  progressFill.style.width = '100%';
  
  // Mark all steps as completed
  for (let i = 1; i <= totalSteps; i++) {
    const step = document.getElementById(`step${i}`);
    step.classList.remove('active');
    step.classList.add('completed');
  }
}
// Login functionality
document.addEventListener('DOMContentLoaded', function() {
  // Initialize particles (if not already done)
  if (!window.particlesInitialized) {
    createParticles();
    window.particlesInitialized = true;
  }
  
  // Password toggle for login form
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
  
  // Login form submission
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
  
  // Social login buttons
  const socialButtons = document.querySelectorAll('.btn-social');
  socialButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      const provider = this.classList.contains('google') ? 'Google' : 'Apple';
      showMessage(`Continuing with ${provider}...`, 'info');
      // In a real app, this would redirect to OAuth flow
      setTimeout(() => {
        showMessage(`${provider} authentication would be implemented here.`, 'info');
      }, 1000);
    });
  });
  
  // Forgot password link
  const forgotPassword = document.querySelector('.forgot-password');
  if (forgotPassword) {
    forgotPassword.addEventListener('click', function(e) {
      e.preventDefault();
      showMessage('Password reset functionality would be implemented here.', 'info');
    });
  }
});

// Handle login form submission
function handleLogin(e) {
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
  const submitBtn = e.target.querySelector('.btn-auth');
  submitBtn.classList.add('loading');
  
  // Simulate API call
  setTimeout(() => {
    // Mock authentication - in real app, this would be an API call
    if (email === 'demo@fintrack.com' && password === 'password') {
      // Successful login
      showMessage('Login successful! Redirecting to dashboard...', 'success');
      
      // Store login state
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
        localStorage.setItem('userEmail', email);
      }
      
      sessionStorage.setItem('isLoggedIn', 'true');
      sessionStorage.setItem('userEmail', email);
      
      // Redirect to dashboard after delay
      setTimeout(() => {
        window.location.href = 'dashboard.html'; // You can create this later
      }, 2000);
      
    } else {
      // Failed login
      showMessage('Invalid email or password. Please try again.', 'error');
      submitBtn.classList.remove('loading');
    }
  }, 2000);
}

// Show message to user
function showMessage(message, type) {
  // Remove existing messages
  const existingMessages = document.querySelectorAll('.success-message, .error-message');
  existingMessages.forEach(msg => msg.remove());
  
  // Create new message element
  const messageEl = document.createElement('div');
  messageEl.className = type === 'success' ? 'success-message' : 'error-message';
  messageEl.textContent = message;
  messageEl.style.display = 'block';
  
  // Insert after the form or at the top of auth form container
  const authForm = document.querySelector('.auth-form');
  if (authForm) {
    authForm.parentNode.insertBefore(messageEl, authForm);
  }
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (messageEl.parentNode) {
      messageEl.style.opacity = '0';
      setTimeout(() => {
        if (messageEl.parentNode) {
          messageEl.parentNode.removeChild(messageEl);
        }
      }, 300);
    }
  }, 5000);
}

// Email validation helper
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Check if user was remembered
function checkRememberedUser() {
  if (localStorage.getItem('rememberMe') === 'true') {
    const rememberedEmail = localStorage.getItem('userEmail');
    if (rememberedEmail) {
      document.getElementById('loginEmail').value = rememberedEmail;
      document.getElementById('rememberMe').checked = true;
    }
  }
}

// Initialize remembered user check when page loads
if (window.location.pathname.includes('login.html')) {
  document.addEventListener('DOMContentLoaded', checkRememberedUser);
}