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