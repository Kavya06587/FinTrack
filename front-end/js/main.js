// Common JavaScript functions that can be used across pages

// Form validation helper
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Password strength checker
function checkPasswordStrength(password) {
    let strength = 0;
    
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
    if (password.match(/\d/)) strength++;
    if (password.match(/[^a-zA-Z\d]/)) strength++;
    
    return strength;
}

// Check if user is authenticated
function checkAuth() {
  const user = localStorage.getItem('user');
  const token = localStorage.getItem('token');
  
  if (!user || !token) {
    // Redirect to login if not authenticated
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// Check if user is logged in (for showing/hiding login/register buttons)
function isLoggedIn() {
  const user = localStorage.getItem('user');
  const token = localStorage.getItem('token');
  return !!(user && token);
}

// Update navigation based on auth status
function updateNavigation() {
  const isUserLoggedIn = isLoggedIn();
  const loginBtn = document.querySelector('a[href="login.html"]');
  const registerBtn = document.querySelector('a[href="reg.html"]');
  
  if (isUserLoggedIn) {
    // User is logged in - show profile/dashboard links
    if (loginBtn) loginBtn.style.display = 'none';
    if (registerBtn) registerBtn.style.display = 'none';
    
    // Add profile link if it doesn't exist
    const user = JSON.parse(localStorage.getItem('user'));
    const nav = document.querySelector('.navbar-nav');
    if (nav && !document.querySelector('.nav-profile')) {
      const profileLi = document.createElement('li');
      profileLi.className = 'nav-item nav-profile';
      profileLi.innerHTML = `
        <a class="nav-link" href="dashboard.html">
          <i class="bi bi-person-circle me-1"></i>${user.firstName}
        </a>
      `;
      nav.appendChild(profileLi);
    }
  }
}

// Logout functionality
function logout() {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  sessionStorage.removeItem('isLoggedIn');
  window.location.href = 'login.html';
}

// Debounce function for performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Smooth scroll to element
function smoothScrollTo(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// Local storage helpers
function saveToLocalStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (e) {
        console.error('Error saving to localStorage:', e);
        return false;
    }
}

function getFromLocalStorage(key) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    } catch (e) {
        console.error('Error reading from localStorage:', e);
        return null;
    }
}