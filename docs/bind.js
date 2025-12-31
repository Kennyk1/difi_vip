// bind.js - Phone Binding Management
// Integrates with Flask backend API

let currentBindAccount = null;
let bindCheckInterval = null;

// ==================== INITIALIZATION ====================
window.addEventListener('DOMContentLoaded', async () => {
    const user = await initDashboard('nav-bind');
    
    if (user) {
        loadWhatsAppAppNumber();
        loadDarinoAccounts();
        setupEventListeners();
    }
});

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // WhatsApp App Number Save
    document.getElementById('btnSaveWhatsApp').addEventListener('click', saveWhatsAppAppNumber);
    
    // Modal controls
    document.getElementById('btnCloseModal').addEventListener('click', closeBindModal);
    document.getElementById('btnRequestCode').addEventListener('click', requestBindCode);
    document.getElementById('btnCheckStatus').addEventListener('click', checkBindStatus);
    document.getElementById('btnDone').addEventListener('click', closeBindModal);
    
    // Close modal on outside click
    document.getElementById('bindModal').addEventListener('click', (e) => {
        if (e.target.id === 'bindModal') {
            closeBindModal();
        }
    });
}

// ==================== WHATSAPP APP NUMBER ====================
function loadWhatsAppAppNumber() {
    const saved = localStorage.getItem('whatsapp_app_number');
    if (saved) {
        document.getElementById('whatsappAppNumber').value = saved;
    }
}

function saveWhatsAppAppNumber() {
    const number = document.getElementById('whatsappAppNumber').value.trim();
    if (number) {
        localStorage.setItem('whatsapp_app_number', number);
        showToast('WhatsApp app number saved!', 'success');
    } else {
        showToast('Please enter a number', 'error');
    }
}

// ==================== LOAD ACCOUNTS ====================
async function loadDarinoAccounts() {
    try {
        const response = await apiCall('/bot/darino/accounts');
        
        if (response && response.success && response.accounts && response.accounts.length > 0) {
            displayBindAccounts(response.accounts);
        } else {
            document.getElementById('bindAccountsList').innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: var(--gray);">
                    <div style="font-size: 4em; margin-bottom: 20px;">📭</div>
                    <h3>No Darino Accounts Found</h3>
                    <p>Create accounts in the Darino bot page first</p>
                    <a href="darino.html" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: var(--primary); color: white; text-decoration: none; border-radius: 10px;">
                        Go to Darino Bot
                    </a>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading accounts:', error);
        document.getElementById('bindAccountsList').innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: var(--gray);">
                <div style="font-size: 4em; margin-bottom: 20px;">❌</div>
                <h3>Error loading accounts</h3>
                <p>${error.message || 'Please try again'}</p>
            </div>
        `;
    }
}

// ==================== DISPLAY ACCOUNTS ====================
function displayBindAccounts(accounts) {
    const html = accounts.map(acc => {
        const status = acc.status || 'not_bound';
        const boundPhone = acc.bound_phone || 'Not bound';
        
        return `
            <div class="bind-account-card" data-account-id="${acc.id}">
                <div class="bind-account-header">
                    <span style="font-weight: 700; color: white;">${acc.email}</span>
                    <span class="bind-status-badge ${status}">${status.toUpperCase().replace('_', ' ')}</span>
                </div>
                <div class="bind-account-details">
                    <div class="bind-detail-item">
                        <span class="bind-detail-label">📧 Email</span>
                        <span class="bind-detail-value">${acc.email}</span>
                    </div>
                    <div class="bind-detail-item">
                        <span class="bind-detail-label">🔑 Password</span>
                        <span class="bind-detail-value">${acc.password}</span>
                    </div>
                    <div class="bind-detail-item">
                        <span class="bind-detail-label">📱 Bound Phone</span>
                        <span class="bind-detail-value">${boundPhone}</span>
                    </div>
                </div>
                <div class="bind-actions">
                    ${status === 'not_bound' ? `
                        <button class="btn-bind" onclick='openBindModal(${JSON.stringify(acc).replace(/'/g, "&apos;")})'>
                            📱 Bind Phone
                        </button>
                    ` : ''}
                    ${status === 'bound' ? `
                        <button class="btn-check" onclick='recheckBinding(${JSON.stringify(acc).replace(/'/g, "&apos;")})'>
                            🔍 Check Status
                        </button>
                        <button class="btn-rebind" onclick='openBindModal(${JSON.stringify(acc).replace(/'/g, "&apos;")})'>
                            🔄 Rebind
                        </button>
                    ` : ''}
                    ${status === 'checking' ? `
                        <button class="btn-check" disabled>
                            ⏳ Checking...
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    document.getElementById('bindAccountsList').innerHTML = html;
}

// ==================== MODAL CONTROLS ====================
function openBindModal(account) {
    currentBindAccount = account;
    document.getElementById('bindModal').classList.add('show');
    resetBindModal();
}

function closeBindModal() {
    document.getElementById('bindModal').classList.remove('show');
    currentBindAccount = null;
    if (bindCheckInterval) {
        clearInterval(bindCheckInterval);
    }
    loadDarinoAccounts(); // Refresh list
}

function resetBindModal() {
    // Show step 1
    document.getElementById('step1').classList.add('active');
    document.getElementById('step2').classList.remove('active');
    document.getElementById('step3').classList.remove('active');
    
    // Reset step indicators
    document.getElementById('stepDot1').classList.add('active');
    document.getElementById('stepDot2').classList.remove('active');
    document.getElementById('stepDot3').classList.remove('active');
    
    // Clear inputs
    document.getElementById('bindPhoneNumber').value = '';
    document.getElementById('verificationCode').textContent = '------';
}

function goToStep(stepNum) {
    // Hide all steps
    document.querySelectorAll('.bind-step').forEach(step => step.classList.remove('active'));
    document.querySelectorAll('.step-dot').forEach(dot => dot.classList.remove('active'));
    
    // Show target step
    document.getElementById(`step${stepNum}`).classList.add('active');
    document.getElementById(`stepDot${stepNum}`).classList.add('active');
}

// ==================== BIND PROCESS ====================
async function requestBindCode() {
    const phone = document.getElementById('bindPhoneNumber').value.trim();
    
    if (!phone) {
        showToast('Please enter a phone number', 'error');
        return;
    }
    
    // Basic validation
    if (!phone.startsWith('+')) {
        showToast('Phone number must start with + and country code', 'error');
        return;
    }
    
    const btnRequestCode = document.getElementById('btnRequestCode');
    btnRequestCode.disabled = true;
    btnRequestCode.textContent = '⏳ Requesting...';
    
    try {
        const response = await apiCall('/bot/darino/bind', {
            method: 'POST',
            body: JSON.stringify({
                account_id: currentBindAccount.id,
                phone: phone
            })
        });
        
        if (response && response.success) {
            // Display verification code (if returned from API)
            const code = response.code || '------';
            document.getElementById('verificationCode').textContent = code;
            
            // Move to step 2
            goToStep(2);
            
            showToast('Verification code requested!', 'success');
        } else {
            throw new Error(response?.error || 'Failed to request bind code');
        }
        
    } catch (error) {
        console.error('Error requesting code:', error);
        showToast(error.message || 'Failed to request code', 'error');
        btnRequestCode.disabled = false;
        btnRequestCode.textContent = '📞 Request Code';
    }
}

async function checkBindStatus() {
    const btnCheckStatus = document.getElementById('btnCheckStatus');
    btnCheckStatus.disabled = true;
    btnCheckStatus.textContent = '⏳ Checking...';
    
    try {
        // Poll the backend to check if binding completed
        const response = await apiCall(`/bot/darino/accounts`);
        
        if (response && response.success) {
            const account = response.accounts.find(a => a.id === currentBindAccount.id);
            
            if (account && account.status === 'bound') {
                // Success!
                goToStep(3);
                showToast('Binding successful!', 'success');
                
                // Start background check after 30 minutes
                setTimeout(() => {
                    recheckBinding(account);
                }, 30 * 60 * 1000);
                
            } else {
                // Not yet bound
                showToast('Binding not complete yet. Please complete WhatsApp pairing.', 'warning');
                btnCheckStatus.disabled = false;
                btnCheckStatus.textContent = '🔍 Check Bind Status';
            }
        } else {
            throw new Error('Failed to check status');
        }
        
    } catch (error) {
        console.error('Error checking status:', error);
        showToast(error.message || 'Failed to verify binding', 'error');
        btnCheckStatus.disabled = false;
        btnCheckStatus.textContent = '🔍 Check Bind Status';
    }
}

// ==================== RECHECK BINDING ====================
async function recheckBinding(account) {
    // Update UI to show checking
    const card = document.querySelector(`[data-account-id="${account.id}"]`);
    if (card) {
        const badge = card.querySelector('.bind-status-badge');
        badge.className = 'bind-status-badge checking';
        badge.textContent = 'CHECKING';
    }
    
    try {
        // Refresh accounts from backend
        const response = await apiCall('/bot/darino/accounts');
        
        if (response && response.success) {
            const updatedAccount = response.accounts.find(a => a.id === account.id);
            
            if (updatedAccount) {
                if (updatedAccount.status === 'bound') {
                    showToast('Still bound!', 'success');
                } else {
                    showToast('Binding expired - please rebind', 'warning');
                }
                
                // Refresh display
                displayBindAccounts(response.accounts);
            }
        }
        
    } catch (error) {
        console.error('Error rechecking:', error);
        showToast('Check failed', 'error');
        
        // Refresh display anyway
        loadDarinoAccounts();
    }
}
