// API Configuration
const API_BASE = 'https://sample-api-1-ryj7.onrender.com';

// ============= AUTHENTICATION =============

// Check Authentication - RUNS IMMEDIATELY
async function checkAuth() {
    const token = localStorage.getItem('token');
    
    // No token? Redirect immediately
    if (!token) {
        window.location.href = 'login.html';
        return null;
    }
    
    try {
        // Verify token with API
        const response = await fetch(`${API_BASE}/auth/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token })
        });
        
        const data = await response.json();
        
        if (!data.success || !data.valid) {
            // Invalid token - clear and redirect
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return null;
        }
        
        // Token valid - return user data
        return JSON.parse(localStorage.getItem('user'));
        
    } catch (error) {
        console.error('Auth verification error:', error);
        // On error, redirect to login
        window.location.href = 'login.html';
        return null;
    }
}

// Get Current User
function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

// Get Auth Token
function getAuthToken() {
    return localStorage.getItem('token');
}

// Logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// ============= API CALLS =============

// Make Authenticated API Call
async function apiCall(endpoint, options = {}) {
    const token = getAuthToken();
    
    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, config);
        const data = await response.json();
        
        // If unauthorized, logout
        if (response.status === 401) {
            logout();
            return null;
        }
        
        return data;
    } catch (error) {
        console.error('API call error:', error);
        throw error;
    }
}

// ============= USER INTERFACE =============

// Display User Info
function displayUserInfo(user) {
    // Update user name in top bar
    const userName = document.getElementById('userName');
    if (userName && user.email) {
        userName.textContent = user.email.split('@')[0];
    }
    
    // Update user avatar
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar && user.email) {
        userAvatar.textContent = user.email.charAt(0).toUpperCase();
    }
    
    // Update full email
    const userEmail = document.getElementById('userEmail');
    if (userEmail && user.email) {
        userEmail.textContent = user.email;
    }
}

// Toggle Mobile Sidebar
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('active');
}

// Toggle User Dropdown
function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('userDropdown');
    const userProfile = document.querySelector('.user-profile');
    
    if (dropdown && userProfile && !userProfile.contains(e.target)) {
        dropdown.classList.remove('show');
    }
});

// ============= NOTIFICATIONS =============

// Show Toast Notification
function showToast(message, type = 'success') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // Style toast
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#10B981' : '#EF4444'};
        color: white;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============= LOADING STATES =============

// Show Loading Spinner
function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div class="spinner" style="width: 40px; height: 40px; border: 4px solid rgba(255,255,255,0.1); border-top-color: #FF3B3B; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                <p style="margin-top: 15px; color: #64748B;">Loading...</p>
            </div>
        `;
    }
}

// Hide Loading
function hideLoading() {
    const authLoading = document.querySelector('.auth-loading');
    if (authLoading) {
        authLoading.style.display = 'none';
    }
    
    const container = document.querySelector('.dashboard-container');
    if (container) {
        container.classList.add('loaded');
    }
}

// ============= UTILITY FUNCTIONS =============

// Format Date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Format Number
function formatNumber(num) {
    return num.toLocaleString('en-US');
}

// Copy to Clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Copy failed:', err);
        showToast('Failed to copy', 'error');
    });
}

// Set Active Navigation
function setActiveNav(pageId) {
    // Remove active from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active to current page
    const currentNav = document.getElementById(pageId);
    if (currentNav) {
        currentNav.classList.add('active');
    }
}

// ============= INITIALIZATION =============

// Initialize Dashboard
async function initDashboard(pageId) {
    try {
        // Check authentication first
        const user = await checkAuth();
        
        if (!user) {
            return; // Will redirect to login
        }
        
        // Display user info
        displayUserInfo(user);
        
        // Set active navigation
        setActiveNav(pageId);
        
        // Hide loading screen
        hideLoading();
        
        return user;
        
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        window.location.href = 'login.html';
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100px);
        }
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);
