// API Configuration
const API_BASE = 'https://sample-api-1-ryj7.onrender.com';

// State Management
let currentUserId = null;
let currentAccounts = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkApiStatus();
    loadFromLocalStorage();
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    document.getElementById('createForm').addEventListener('submit', handleCreateAccounts);
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
}

// Check API Status
async function checkApiStatus() {
    const statusEl = document.getElementById('apiStatus');
    const statusDot = statusEl.querySelector('.status-dot');
    const statusText = statusEl.querySelector('.status-text');
    
    try {
        const response = await fetch(`${API_BASE}/`);
        const data = await response.json();
        
        if (data.status === 'online') {
            statusEl.classList.add('online');
            statusEl.classList.remove('offline');
            statusText.textContent = 'API Online';
        } else {
            throw new Error('API offline');
        }
    } catch (error) {
        statusEl.classList.add('offline');
        statusEl.classList.remove('online');
        statusText.textContent = 'API Offline';
        console.error('API Status Error:', error);
    }
}

// Handle Create Accounts
async function handleCreateAccounts(e) {
    e.preventDefault();
    
    const promoCode = document.getElementById('promoCode').value.trim();
    const accountCount = parseInt(document.getElementById('accountCount').value);
    const createBtn = document.getElementById('createBtn');
    const progressContainer = document.getElementById('progressContainer');
    
    // Validate promo code
    if (!promoCode || promoCode.length !== 6 || !/^\d+$/.test(promoCode)) {
        showMessage('createMessage', 'Promo code must be exactly 6 digits!', 'error');
        return;
    }
    
    // Validate count
    if (accountCount < 1 || accountCount > 50) {
        showMessage('createMessage', 'Account count must be between 1 and 50!', 'error');
        return;
    }
    
    // Disable button and show progress
    createBtn.disabled = true;
    createBtn.innerHTML = '<span class="btn-icon">⏳</span> Creating Accounts...';
    progressContainer.classList.add('show');
    updateProgress(0, accountCount, 'Starting...');
    
    try {
        // Simulate progress updates
        let completed = 0;
        const progressInterval = setInterval(() => {
            if (completed < accountCount) {
                completed++;
                updateProgress(completed, accountCount, `Creating account ${completed}/${accountCount}...`);
            }
        }, 1500); // Update every 1.5 seconds
        
        // Make API request
        const response = await fetch(`${API_BASE}/create-accounts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                promo_code: promoCode,
                count: accountCount,
                user_id: currentUserId // Use existing user_id if available
            })
        });
        
        clearInterval(progressInterval);
        
        const data = await response.json();
        
        if (data.success) {
            currentUserId = data.user_id;
            currentAccounts = data.accounts;
            
            // Save to localStorage
            saveToLocalStorage();
            
            // Update UI
            updateProgress(accountCount, accountCount, 'Complete!');
            displayAccounts(data.accounts);
            updateStats(data.user_id, data.accounts);
            
            showMessage(
                'createMessage',
                `Successfully created ${data.created} out of ${accountCount} accounts! Your User ID: ${data.user_id}`,
                'success'
            );
            
            // Enable download button
            document.getElementById('downloadBtn').disabled = false;
            
            // Reset form
            document.getElementById('createForm').reset();
        } else {
            throw new Error(data.error || 'Failed to create accounts');
        }
        
    } catch (error) {
        console.error('Create Accounts Error:', error);
        showMessage('createMessage', `Error: ${error.message}`, 'error');
        updateProgress(0, accountCount, 'Failed!');
    } finally {
        createBtn.disabled = false;
        createBtn.innerHTML = '<span class="btn-icon">🚀</span> Generate Accounts';
        
        setTimeout(() => {
            progressContainer.classList.remove('show');
        }, 3000);
    }
}

// Handle Login
async function handleLogin(e) {
    e.preventDefault();
    
    const userId = document.getElementById('userId').value.trim();
    
    if (!userId) {
        showMessage('loginMessage', 'Please enter a User ID!', 'error');
        return;
    }
    
    const loginBtn = document.getElementById('loginBtn');
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="btn-icon">⏳</span> Loading...';
    
    try {
        const response = await fetch(`${API_BASE}/get-accounts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUserId = data.user_id;
            currentAccounts = data.accounts;
            
            // Save to localStorage
            saveToLocalStorage();
            
            // Update UI
            displayAccounts(data.accounts);
            updateStats(data.user_id, data.accounts);
            
            showMessage('loginMessage', 'Login successful!', 'success');
            
            // Enable download button
            document.getElementById('downloadBtn').disabled = false;
            
            // Reset form
            document.getElementById('loginForm').reset();
        } else {
            throw new Error(data.error || 'User ID not found');
        }
        
    } catch (error) {
        console.error('Login Error:', error);
        showMessage('loginMessage', `Error: ${error.message}`, 'error');
    } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<span class="btn-icon">🔓</span> View My Accounts';
    }
}

// Update Progress Bar
function updateProgress(current, total, message) {
    const percent = Math.round((current / total) * 100);
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const progressInfo = document.getElementById('progressInfo');
    
    progressFill.style.width = percent + '%';
    progressText.textContent = `${percent}%`;
    progressInfo.textContent = message;
}

// Display Accounts
function displayAccounts(accounts) {
    const accountsList = document.getElementById('accountsList');
    
    if (!accounts || accounts.length === 0) {
        accountsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <h3>No Accounts Yet</h3>
                <p>Create your first batch of accounts to get started!</p>
            </div>
        `;
        return;
    }
    
    accountsList.innerHTML = accounts.map((account, index) => {
        const isFailed = account.status === 'failed';
        return `
            <div class="account-item ${isFailed ? 'failed' : ''}">
                <div class="account-header-item">
                    <span class="account-number">Account #${index + 1}</span>
                    <span class="status-badge ${account.status}">${account.status.toUpperCase()}</span>
                </div>
                <div class="account-details">
                    <div class="detail-item">
                        <span class="detail-label">📧 Email</span>
                        <span class="detail-value">${account.email}</span>
                    </div>
                    <div class="detail-item">
                        <button class="copy-btn" onclick="copyToClipboard('${account.email}', this)">
                            📋 Copy Email
                        </button>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">🔑 Password</span>
                        <span class="detail-value">${account.password}</span>
                    </div>
                    <div class="detail-item">
                        <button class="copy-btn" onclick="copyToClipboard('${account.password}', this)">
                            📋 Copy Password
                        </button>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">🎫 Promo Code</span>
                        <span class="detail-value">${account.promo_code}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">📅 Created</span>
                        <span class="detail-value">${new Date(account.created_at).toLocaleString()}</span>
                    </div>
                    ${isFailed ? `
                        <div class="detail-item" style="grid-column: 1 / -1;">
                            <span class="detail-label">❌ Error</span>
                            <span class="detail-value" style="color: var(--danger);">${account.error}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Update Stats
function updateStats(userId, accounts) {
    document.getElementById('currentUser').textContent = userId.substring(0, 20) + '...';
    document.getElementById('totalAccounts').textContent = accounts.length;
    document.getElementById('successAccounts').textContent = 
        accounts.filter(acc => acc.status === 'success').length;
}

// Show Message
function showMessage(elementId, message, type) {
    const el = document.getElementById(elementId);
    el.textContent = message;
    el.className = `message ${type} show`;
    
    setTimeout(() => {
        el.classList.remove('show');
    }, 5000);
}

// Copy to Clipboard
function copyToClipboard(text, button) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = button.innerHTML;
        button.innerHTML = '✅ Copied!';
        button.style.background = '#059669';
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.style.background = '';
        }, 2000);
    }).catch(err => {
        console.error('Copy failed:', err);
        alert('Failed to copy to clipboard');
    });
}

// Download Accounts
function downloadAccounts() {
    if (!currentAccounts || currentAccounts.length === 0) {
        alert('No accounts to download!');
        return;
    }
    
    let content = '='.repeat(70) + '\n';
    content += 'FXC BOT LOOTERS - DEFI PRODUCTS ACCOUNTS\n';
    content += '='.repeat(70) + '\n';
    content += `User ID: ${currentUserId}\n`;
    content += `Generated: ${new Date().toLocaleString()}\n`;
    content += `Total Accounts: ${currentAccounts.length}\n`;
    content += '='.repeat(70) + '\n\n';
    
    // Group by promo code
    const promoGroups = {};
    currentAccounts.forEach(acc => {
        if (!promoGroups[acc.promo_code]) {
            promoGroups[acc.promo_code] = [];
        }
        promoGroups[acc.promo_code].push(acc);
    });
    
    Object.entries(promoGroups).forEach(([promo, accounts]) => {
        content += '\n' + '='.repeat(70) + '\n';
        content += `PROMO CODE: ${promo}\n`;
        content += `Registration Link: https://defiproducts.vip/?code=${promo}\n`;
        content += `Accounts: ${accounts.length}\n`;
        content += '='.repeat(70) + '\n\n';
        
        accounts.forEach((acc, idx) => {
            content += `Account #${idx + 1}:\n`;
            content += `  Email:    ${acc.email}\n`;
            content += `  Password: ${acc.password}\n`;
            content += `  Status:   ${acc.status}\n`;
            content += `  Created:  ${new Date(acc.created_at).toLocaleString()}\n`;
            content += `  Login:    https://defiproducts.vip\n`;
            content += `  Format:   ${acc.email}:${acc.password}\n`;
            if (acc.error) {
                content += `  Error:    ${acc.error}\n`;
            }
            content += '-'.repeat(70) + '\n';
        });
    });
    
    content += '\n' + '='.repeat(70) + '\n';
    content += 'END OF FILE\n';
    content += '='.repeat(70) + '\n';
    
    // Create and download file
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fxc_accounts_${currentUserId}_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Local Storage Functions
function saveToLocalStorage() {
    if (currentUserId && currentAccounts) {
        const data = {
            userId: currentUserId,
            accounts: currentAccounts,
            lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('fxc_data', JSON.stringify(data));
    }
}

function loadFromLocalStorage() {
    const stored = localStorage.getItem('fxc_data');
    if (stored) {
        try {
            const data = JSON.parse(stored);
            currentUserId = data.userId;
            currentAccounts = data.accounts;
            
            if (currentAccounts && currentAccounts.length > 0) {
                displayAccounts(currentAccounts);
                updateStats(currentUserId, currentAccounts);
                document.getElementById('downloadBtn').disabled = false;
            }
        } catch (error) {
            console.error('Error loading from localStorage:', error);
        }
    }
}

// Refresh API status every 30 seconds
setInterval(checkApiStatus, 30000);
