// bind.js - Phone Binding Management
// Fully updated to handle UUID passing and status verification
// Now supports multiple bots (darino & lavend) and shows metadata.last_phone

let currentBindAccount = null;
let bindCheckInterval = null;

// ==================== INITIALIZATION ====================
window.addEventListener('DOMContentLoaded', async () => {
    const user = await initDashboard('nav-bind');
    
    if (user) {
        // Removed loadWhatsAppAppNumber() call as per request
        loadAllBotAccounts();
        setupEventListeners();
    }
});

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Removed btnSaveWhatsApp listener since saving is removed
    
    document.getElementById('btnCloseModal').addEventListener('click', closeBindModal);
    document.getElementById('btnRequestCode').addEventListener('click', requestBindCode);
    document.getElementById('btnCheckStatus').addEventListener('click', checkBindStatus);
    document.getElementById('btnDone').addEventListener('click', closeBindModal);
    
    document.getElementById('bindModal').addEventListener('click', (e) => {
        if (e.target.id === 'bindModal') closeBindModal();
    });
}

// ==================== LOAD ACCOUNTS FOR ALL BOTS ====================
async function loadAllBotAccounts() {
    try {
        // Fetch darino accounts
        const darinoResponse = await apiCall('/bot/darino/accounts');
        // Fetch lavend accounts
        const lavendResponse = await apiCall('/bot/lavend/accounts');
        
        let combinedAccounts = [];
        if (darinoResponse?.success && darinoResponse.accounts?.length > 0) {
            combinedAccounts = combinedAccounts.concat(darinoResponse.accounts.map(acc => ({...acc, bot_type: 'darino'})));
        }
        if (lavendResponse?.success && lavendResponse.accounts?.length > 0) {
            combinedAccounts = combinedAccounts.concat(lavendResponse.accounts.map(acc => ({...acc, bot_type: 'lavend'})));
        }
        
        if (combinedAccounts.length > 0) {
            displayBindAccounts(combinedAccounts);
        } else {
            document.getElementById('bindAccountsList').innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: var(--gray);">
                    <div style="font-size: 4em; margin-bottom: 20px;">📭</div>
                    <h3>No Accounts Found</h3>
                    <p>Create accounts in the bot pages first</p>
                    <a href="darino.html" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: var(--primary); color: white; text-decoration: none; border-radius: 10px;">
                        Go to Darino Bot
                    </a>
                    <br/>
                    <a href="lavend.html" style="display: inline-block; margin-top: 10px; padding: 12px 24px; background: var(--primary); color: white; text-decoration: none; border-radius: 10px;">
                        Go to Lavend Bot
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
        // Use metadata.last_phone if exists, fallback to acc.bound_phone or 'Not bound'
        const boundPhone = acc.metadata?.last_phone || acc.bound_phone || 'Not bound';
        
        return `
            <div class="bind-account-card" data-account-id="${acc.id}" data-bot-type="${acc.bot_type}">
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
                    <div class="bind-detail-item">
                        <span class="bind-detail-label">🤖 Bot Type</span>
                        <span class="bind-detail-value">${acc.bot_type}</span>
                    </div>
                </div>
                <div class="bind-actions">
                    ${status === 'not_bound' ? `<button class="btn-bind" onclick='openBindModal(${JSON.stringify(acc).replace(/'/g, "&apos;")})'>📱 Bind Phone</button>` : ''}
                    ${status === 'bound' ? `
                        <button class="btn-check" onclick='recheckBinding(${JSON.stringify(acc).replace(/'/g, "&apos;")})'>🔍 Check Status</button>
                        <button class="btn-rebind" onclick='openBindModal(${JSON.stringify(acc).replace(/'/g, "&apos;")})'>🔄 Rebind</button>
                    ` : ''}
                    ${status === 'checking' ? `<button class="btn-check" disabled>⏳ Checking...</button>` : ''}
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
    if (bindCheckInterval) clearInterval(bindCheckInterval);
    loadAllBotAccounts();
}

function resetBindModal() {
    goToStep(1);
    document.getElementById('bindPhoneNumber').value = '';
    document.getElementById('verificationCode').textContent = '------';
}

function goToStep(stepNum) {
    document.querySelectorAll('.bind-step').forEach(step => step.classList.remove('active'));
    document.querySelectorAll('.step-dot').forEach(dot => dot.classList.remove('active'));
    
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

    if (!phone.startsWith('+')) {
        showToast('Phone number must start with + and country code', 'error');
        return;
    }

    const btnRequestCode = document.getElementById('btnRequestCode');
    btnRequestCode.disabled = true;
    btnRequestCode.textContent = '⏳ Requesting...';

    try {
        // Use the correct bot type API endpoint dynamically
        const botType = currentBindAccount.bot_type || 'darino';
        const response = await apiCall(`/bot/${botType}/bind`, {
            method: 'POST',
            body: JSON.stringify({
                account_id: currentBindAccount.id,
                phone: phone
            })
        });

        if (response?.success) {
            currentBindAccount.uuid = response.uuid;

            // Force verification code display to 777777 (as per original)
            document.getElementById('verificationCode').textContent = '77777777';

            goToStep(2);
            showToast('Code requested! Enter 77777777 in WhatsApp.', 'success');
        } else {
            throw new Error(response?.error || 'Failed to request bind code');
        }
    } catch (error) {
        console.error('Error requesting code:', error);
        showToast(error.message || 'Failed to request code', 'error');
    } finally {
        btnRequestCode.disabled = false;
        btnRequestCode.textContent = '📞 Request Code';
    }
}

async function checkBindStatus() {
    if (!currentBindAccount?.uuid) {
        showToast('Binding session not found. Please restart.', 'error');
        return;
    }

    const btnCheckStatus = document.getElementById('btnCheckStatus');
    btnCheckStatus.disabled = true;
    btnCheckStatus.textContent = '⏳ Verifying...';

    try {
        const botType = currentBindAccount.bot_type || 'darino';
        const response = await apiCall(`/bot/${botType}/bind/status`, {
            method: 'POST',
            body: JSON.stringify({
                account_id: currentBindAccount.id,
                uuid: currentBindAccount.uuid
            })
        });

        if (response?.success) {
            goToStep(3);
            showToast('Binding successful!', 'success');
            loadAllBotAccounts(); // Reload all accounts
        } else {
            showToast(response.message || 'Not yet confirmed in WhatsApp', 'warning');
        }
    } catch (error) {
        console.error('Error checking status:', error);
        showToast('Verification failed', 'error');
    } finally {
        btnCheckStatus.disabled = false;
        btnCheckStatus.textContent = '🔍 Check Bind Status';
    }
}

// ==================== RECHECK BINDING ====================
async function recheckBinding(account) {
    const card = document.querySelector(`[data-account-id="${account.id}"]`);
    if (card) {
        const badge = card.querySelector('.bind-status-badge');
        badge.className = 'bind-status-badge checking';
        badge.textContent = 'CHECKING';
    }
    
    try {
        const botType = account.bot_type || 'darino';
        const response = await apiCall(`/bot/${botType}/accounts`);
        if (response?.success) {
            const updatedAccount = response.accounts.find(a => a.id === account.id);
            if (updatedAccount) {
                showToast(updatedAccount.status === 'bound' ? 'Still bound!' : 'Binding expired', updatedAccount.status === 'bound' ? 'success' : 'warning');
                // Reload all accounts to keep UI consistent
                loadAllBotAccounts();
            }
        }
    } catch (error) {
        console.error('Error rechecking:', error);
        showToast('Check failed', 'error');
        loadAllBotAccounts();
    }
}
