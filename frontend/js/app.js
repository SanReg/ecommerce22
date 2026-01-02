let token = localStorage.getItem('token');
let currentUser = localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser')) : null;
let unlimitedInfo = null;
let books = [];
const DISCORD_INVITE_URL = 'https://discord.gg/7TrBn3wBf5'; // TODO: Replace with your actual invite link

// Check if user is logged in
if (!token) {
  window.location.href = 'login.html';
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  displayUserInfo();
  loadBooks();
  setupTabButtons();
  checkServiceStatus();
  setupPasswordChangeForm();
});

function setupTabButtons() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabName = e.target.dataset.tab;
      switchTab(tabName);
    });
  });
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  document.getElementById(tabName).classList.add('active');
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

  if (tabName === 'orders') {
    loadUserOrders();
  }
}

function displayUserInfo() {
  document.getElementById('username').textContent = currentUser.username;
  updateChecksDisplay();
}

async function updateChecksDisplay() {
  try {
    const response = await fetch('/api/checks/balance', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    document.getElementById('checksAmount').textContent = data.checks;
    currentUser.checks = data.checks;
    currentUser.isUnlimited = data.isUnlimited;
    currentUser.unlimitedInfo = data.unlimitedInfo;
    unlimitedInfo = data.unlimitedInfo;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    // Display unlimited status if applicable
    const unlimitedNotice = document.getElementById('unlimitedStatusNotice');
    if (data.isUnlimited && data.unlimitedInfo) {
      const info = data.unlimitedInfo;
      const resetDate = new Date(info.creditsResetAt);
      const resetDateStr = resetDate.toLocaleString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit',
        timeZoneName: 'short'
      });
      unlimitedNotice.innerHTML = `⭐ <strong>Unlimited User</strong> | Daily Credits: <span style="color: #ffffff; font-weight: bold;">${info.dailyCreditsAvailable}/${info.dailyCredits}</span> | ${info.subscriptionDaysRemaining} days remaining | Next Reset: ${resetDateStr}`;
      unlimitedNotice.style.display = 'block';
    } else {
      unlimitedNotice.style.display = 'none';
    }
  } catch (error) {
    console.error('Error fetching checks:', error);
  }
}

function getAvailableCredits() {
  const regular = Number(currentUser?.checks || 0);
  if (currentUser?.isUnlimited && currentUser?.unlimitedInfo) {
    const dailyAvailable = Math.max(0, Number(currentUser.unlimitedInfo.dailyCreditsAvailable || 0));
    return {
      total: dailyAvailable + regular,
      dailyAvailable,
      regular
    };
  }
  return { total: regular, dailyAvailable: 0, regular };
}

async function loadBooks() {
  try {
    const response = await fetch('/api/products');
    books = await response.json();
    displayServices();
  } catch (error) {
    showMessage('Error loading services', 'error');
  }
}

function displayServices() {
  const container = document.getElementById('booksGrid');
  container.innerHTML = '';

  // Find TurnItIn service product (price 1)
  const turnitin = (books || []).find(b => (b.title || '').toLowerCase().includes('turnitin'));

  // TurnItIn Check (1 credit)
  const cardTurnitin = document.createElement('div');
  cardTurnitin.style.cssText = `
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(124, 58, 202, 0.1) 100%);
    border: 2px solid var(--card-border);
    border-radius: 12px;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: all 0.3s ease;
    cursor: pointer;
  `;
  cardTurnitin.onmouseover = (e) => e.currentTarget.style.transform = 'translateY(-4px)';
  cardTurnitin.onmouseout = (e) => e.currentTarget.style.transform = 'translateY(0)';
  
  const turnitinAvailable = !!turnitin;
  cardTurnitin.innerHTML = `
    <div style="margin-bottom: 1.5rem;">
      <div style="font-size: 2.5rem; margin-bottom: 1rem;">🔍</div>
      <h3 style="font-size: 1.3rem; margin-bottom: 0.75rem; color: var(--text-primary);">Turnitin Check</h3>
      <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.5;">We provide similarity and AI detection reports generated through Turnitin, helping you review your work before final submission.<br><em>Files are not stored in Turnitin!<em></p>
    </div>
    <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 1rem; border-top: 1px solid var(--card-border);">
      <span style="background: linear-gradient(135deg, #a89968 0%, #8b7d5e 100%); color: white; padding: 0.5rem 1rem; border-radius: 6px; font-weight: 600; font-size: 0.9rem;">💎 1 Credit</span>
      ${turnitinAvailable
        ? `<button onclick="openBuyModal('${turnitin._id}', 'TurnItIn Check', 1)" style="background: linear-gradient(135deg, var(--primary) 0%, #7c3aca 100%); color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 6px; cursor: pointer; font-weight: 600; transition: all 0.3s ease;">Submit Now →</button>`
        : `<button disabled style="opacity: 0.5; cursor: not-allowed; background: #666; color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 6px; font-weight: 600;">Unavailable</button>`}
    </div>
  `;
  container.appendChild(cardTurnitin);

  // Rewrite (Discord)
  const cardRewrite = document.createElement('div');
  cardRewrite.style.cssText = `
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
    border: 2px solid var(--card-border);
    border-radius: 12px;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: all 0.3s ease;
    cursor: pointer;
  `;
  cardRewrite.onmouseover = (e) => e.currentTarget.style.transform = 'translateY(-4px)';
  cardRewrite.onmouseout = (e) => e.currentTarget.style.transform = 'translateY(0)';
  
  cardRewrite.innerHTML = `
    <div style="margin-bottom: 1.5rem;">
      <div style="font-size: 2.5rem; margin-bottom: 1rem;">✏️</div>
      <h3 style="font-size: 1.3rem; margin-bottom: 0.75rem; color: var(--text-primary);">Rewrite</h3>
      <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.5;">We rewrite your document 100% manually by a human writer, ensuring 0% AI detection on Turnitin.
A Turnitin report is provided along with the final rewritten file.</p>
    </div>
    <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 1rem; border-top: 1px solid var(--card-border);">
      <span style="background: linear-gradient(135deg, #a89968 0%, #8b7d5e 100%); color: white; padding: 0.5rem 1rem; border-radius: 6px; font-weight: 600; font-size: 0.9rem;">✨ Inquire</span>
      <a href="${DISCORD_INVITE_URL}" target="_blank" rel="noopener" style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 6px; cursor: pointer; font-weight: 600; text-decoration: none; transition: all 0.3s ease; display: inline-block;">Open Discord →</a>
    </div>
  `;
  container.appendChild(cardRewrite);

  // Academic Tools & Entertainment (Discord)
  const cardTools = document.createElement('div');
  cardTools.style.cssText = `
    background: linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, rgba(6, 182, 212, 0.12) 50%, rgba(99, 102, 241, 0.12) 100%);
    border: 2px solid var(--card-border);
    border-radius: 12px;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: all 0.3s ease;
    cursor: pointer;
  `;
  cardTools.onmouseover = (e) => e.currentTarget.style.transform = 'translateY(-4px)';
  cardTools.onmouseout = (e) => e.currentTarget.style.transform = 'translateY(0)';
  
  cardTools.innerHTML = `
    <div style="margin-bottom: 1.5rem;">
      <div style="font-size: 2.5rem; margin-bottom: 1rem;">🎛️</div>
      <h3 style="font-size: 1.3rem; margin-bottom: 0.75rem; color: var(--text-primary);">Academic tools & entertainment</h3>
      <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.5;">Access ChatGPT, QuillBot, Gemini, CapCut, Perplexity, Netflix etc. at discounted rates.<br>Fast activation, full control, 100% confidentiality.</p>
    </div>
    <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 1rem; border-top: 1px solid var(--card-border);">
      <span style="background: linear-gradient(135deg, #a89968 0%, #8b7d5e 100%); color: white; padding: 0.5rem 1rem; border-radius: 6px; font-weight: 600; font-size: 0.9rem;">✨ Inquire</span>
      <a href="${DISCORD_INVITE_URL}" target="_blank" rel="noopener" style="background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%); color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 6px; cursor: pointer; font-weight: 600; text-decoration: none; transition: all 0.3s ease; display: inline-block;">Open Discord →</a>
    </div>
  `;
  container.appendChild(cardTools);
}

function openBuyModal(bookId, bookTitle, price) {
  const available = getAvailableCredits();
  if (available.total < price) {
    const shortfall = price - available.total;
    showMessage(`Insufficient credits for this purchase. You need ${shortfall} more credit(s).`, 'error');
    return;
  }

  document.getElementById('selectedBookId').value = bookId;
  document.getElementById('selectedBookTitle').textContent = bookTitle;
  document.getElementById('selectedBookPrice').textContent = price;
  document.getElementById('buyModal').style.display = 'flex';
}

function closeBuyModal() {
  document.getElementById('buyModal').style.display = 'none';
  document.getElementById('uploadFile').value = '';
  document.getElementById('uploadProgress').style.display = 'none';
  document.getElementById('uploadProgressBar').value = 0;
  document.getElementById('confirmPurchaseBtn').disabled = false;
  document.getElementById('cancelBuyBtn').disabled = false;
}

async function submitOrder() {
  const bookId = document.getElementById('selectedBookId').value;
  const fileInput = document.getElementById('uploadFile');
  const confirmBtn = document.getElementById('confirmPurchaseBtn');
  const cancelBtn = document.getElementById('cancelBuyBtn');
  const progressDiv = document.getElementById('uploadProgress');
  const progressBar = document.getElementById('uploadProgressBar');
  const progressText = document.getElementById('uploadProgressText');
  const formData = new FormData();
  
  if (!fileInput.files.length) {
    showMessage('Please upload a file to proceed with your order', 'error');
    return;
  }

  // Disable buttons during upload
  confirmBtn.disabled = true;
  cancelBtn.disabled = true;
  progressDiv.style.display = 'block';
  progressBar.value = 0;
  progressText.textContent = '0%';

  formData.append('bookId', bookId);
  if (fileInput.files.length > 0) {
    formData.append('file', fileInput.files[0]);
  }

  try {
    // Simulate progress (0-90% during upload, 100% on completion)
    const progressInterval = setInterval(() => {
      const current = parseInt(progressBar.value);
      if (current < 90) {
        progressBar.value = current + Math.random() * 15;
        progressText.textContent = Math.floor(progressBar.value) + '%';
      }
    }, 200);

    const response = await fetch('/api/orders/create', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });

    clearInterval(progressInterval);
    progressBar.value = 100;
    progressText.textContent = '100%';

    const data = await response.json();
    
    if (response.ok) {
      showMessage(data.message, 'success');
      setTimeout(() => {
        closeBuyModal();
        loadBooks();
        updateChecksDisplay();
      }, 500);
    } else {
      showMessage(data.message, 'error');
      progressDiv.style.display = 'none';
      confirmBtn.disabled = false;
      cancelBtn.disabled = false;
    }
  } catch (error) {
    showMessage('Error creating order: ' + error.message, 'error');
    progressDiv.style.display = 'none';
    confirmBtn.disabled = false;
    cancelBtn.disabled = false;
  }
}

async function loadUserOrders() {
  try {
    const response = await fetch('/api/orders/my-orders', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const orders = await response.json();
    displayUserOrders(orders);
  } catch (error) {
    showMessage('Error loading orders', 'error');
  }
}

function displayUserOrders(orders) {
  const container = document.getElementById('userOrdersContainer');
  
  if (orders.length === 0) {
    container.innerHTML = '<div class="empty-state"><h2>No orders yet</h2></div>';
    return;
  }

  let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; margin-top: 1.5rem;">';

  orders.forEach(order => {
    const statusClass = order.status === 'completed' ? 'status-completed' : (order.status === 'failed' ? 'status-failed' : 'status-pending');
    const orderDateTime = new Date(order.createdAt);
    const date = orderDateTime.toLocaleDateString();
    const time = orderDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // User file link
    const userFileUrl = order.userFile && (order.userFile.url || order.userFile.secure_url || order.userFile.path);
    const userFileLink = userFileUrl
      ? `<a href="${userFileUrl}" target="_blank" rel="noopener" download style="color: #ffffff; text-decoration: none; font-weight: 600;">📥 Download Your File</a>`
      : '<span style="color: #999;">No file</span>';
    
    // AI Report link
    const aiReportUrl = order.adminFiles && order.adminFiles.aiReport && (order.adminFiles.aiReport.url || order.adminFiles.aiReport.secure_url);
    const aiReportLink = aiReportUrl
      ? `<a href="${aiReportUrl}" target="_blank" rel="noopener" download style="color: #ffffff; text-decoration: none; font-weight: 600;">📊 AI Report</a>`
      : (order.status === 'completed' ? '<span style="color: #999;">Not uploaded</span>' : '<span style="color: #f59e0b;">Pending</span>');
    
    // Similarity Report link
    const similarityUrl = order.adminFiles && order.adminFiles.similarityReport && (order.adminFiles.similarityReport.url || order.adminFiles.similarityReport.secure_url);
    const similarityLink = similarityUrl
      ? `<a href="${similarityUrl}" target="_blank" rel="noopener" download style="color: #ffffff; text-decoration: none; font-weight: 600;">🔍 Similarity Report</a>`
      : (order.status === 'completed' ? '<span style="color: #999;">Not uploaded</span>' : '<span style="color: #f59e0b;">Pending</span>');

    html += `
      <div style="background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); border: 2px solid #e5e7eb; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 15px rgba(0,0,0,0.08); transition: all 0.3s ease;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
          <div>
            <h3 style="color: #1f2937; font-size: 1.1rem; margin: 0 0 0.3rem 0; font-weight: 700;">${order.book.title}</h3>
            <code style="background: #f0f0f0; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; color: #666;">${order._id.substring(0, 12)}...</code>
          </div>
          <span class="status-badge ${statusClass}" style="font-size: 0.85rem; padding: 0.4rem 0.8rem;">${order.status}</span>
        </div>

        <!-- Price and Date -->
        <div style="display: flex; justify-content: space-between; color: #6b7280; font-size: 0.9rem; margin-bottom: 1.2rem; padding-bottom: 1rem; border-bottom: 1px solid #e5e7eb;">
          <span><strong>${order.checksUsed}</strong> Credits</span>
          <span>${date} • ${time}</span>
        </div>

        <!-- Files Section -->
        <div style="margin-bottom: 1.2rem;">
          <p style="color: #1f2937; font-weight: 600; margin: 0 0 0.8rem 0; font-size: 0.9rem;">📄 Your Submission</p>
          <div style="padding: 0.8rem 1rem; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 8px; text-align: center;">
            ${userFileLink}
          </div>
        </div>

        <!-- Reports / Status Section -->
        ${order.status === 'completed' ? `
          <div style="margin-bottom: 0;">
            <p style="color: #1f2937; font-weight: 600; margin: 0 0 0.8rem 0; font-size: 0.9rem;">📋 Admin Reports</p>
            <div style="display: grid; gap: 0.8rem;">
              <div style="padding: 0.8rem 1rem; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px; text-align: center;">
                ${aiReportLink}
              </div>
              <div style="padding: 0.8rem 1rem; background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); border-radius: 8px; text-align: center;">
                ${similarityLink}
              </div>
            </div>
          </div>
        ` : (order.status === 'failed' ? `
          <div style="padding: 1rem; background: #fee2e2; border: 1px solid #fca5a5; border-radius: 8px; color: #7f1d1d;">
            <p style="margin: 0 0 0.4rem 0; font-size: 0.9rem; font-weight: 600;">❌ Order Failed</p>
            <p style="margin: 0; font-size: 0.9rem;">Reason: ${order.failureReason || 'Not specified'}</p>
            <p style="margin: 0.4rem 0 0 0; font-size: 0.9rem; color: #1f2937;">💎 Credits Refunded: <strong>${order.refundAmount || order.checksUsed}</strong></p>
          </div>
        ` : `
          <div style="padding: 1rem; background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; color: #92400e;">
            <p style="margin: 0; font-size: 0.9rem; font-weight: 500;">⏳ Reports pending - Admin will upload soon</p>
          </div>
        `)}
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}


async function redeemCode() {
  const code = document.getElementById('codeInput').value.trim();
  
  if (!code) {
    showMessage('Please enter a code', 'error');
    return;
  }

  try {
    const response = await fetch('/api/checks/redeem', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code })
    });

    const data = await response.json();

    if (response.ok) {
      showMessage(data.message + ' (+' + data.checksAdded + ' Credits)', 'success');
      document.getElementById('codeInput').value = '';
      updateChecksDisplay();
    } else {
      showMessage(data.message, 'error');
    }
  } catch (error) {
    showMessage('Error redeeming code: ' + error.message, 'error');
  }
}

function showMessage(message, type) {
  const msgDiv = document.getElementById('message');
  msgDiv.textContent = message;
  msgDiv.className = `message show ${type}`;
  
  setTimeout(() => {
    msgDiv.classList.remove('show');
  }, 5000);
}

function logout() {
  localStorage.clear();
  window.location.href = 'login.html';
}

// Modal functions
document.addEventListener('click', (e) => {
  const modal = document.getElementById('buyModal');
  if (e.target === modal) {
    closeBuyModal();
  }
});

// Service Status Check
async function checkServiceStatus() {
  try {
    const response = await fetch('/api/service/status', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    
    if (response.ok) {
      displayServiceStatusNotice(data.isOnline);
    }
  } catch (error) {
    console.error('Error checking service status:', error);
  }
}

function displayServiceStatusNotice(isOnline) {
  const notice = document.getElementById('serviceStatusNotice');
  
  if (!notice) return;
  
  notice.style.display = 'block';
  
  if (isOnline) {
    notice.innerHTML = '<img src="https://cdn.discordapp.com/emojis/1437360640409866240.gif" alt="Online" style="width: 28px; height: 28px; vertical-align: middle; margin-right: 10px;">All services are online.';
    notice.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.2) 100%)';
    notice.style.color = '#10b981';
    notice.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    notice.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.2)';
  } else {
    notice.innerHTML = '<img src="https://cdn.discordapp.com/emojis/1043080375649447936.gif" alt="Offline" style="width: 28px; height: 28px; vertical-align: middle; margin-right: 10px;">We are currently offline. Please wait until we are back in a few hours.';
    notice.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.2) 100%)';
    notice.style.color = '#ef4444';
    notice.style.borderColor = 'rgba(239, 68, 68, 0.4)';
    notice.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.2)';
  }
}

function setupPasswordChangeForm() {
  const form = document.getElementById('changePasswordForm');
  const messageDiv = document.getElementById('passwordMessage');
  
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    messageDiv.style.display = 'none';

    const oldPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!oldPassword || !newPassword || !confirmPassword) {
      showPasswordMessage('All fields are required', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showPasswordMessage('New password must be at least 6 characters', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showPasswordMessage('New passwords do not match', 'error');
      return;
    }

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          oldPassword,
          newPassword,
          confirmPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        showPasswordMessage('✅ Password changed successfully!', 'success');
        form.reset();
        setTimeout(() => {
          messageDiv.style.display = 'none';
        }, 5000);
      } else {
        showPasswordMessage(`❌ ${data.message || 'Failed to change password'}`, 'error');
      }
    } catch (error) {
      showPasswordMessage('❌ Error changing password: ' + error.message, 'error');
    }
  });
}

function showPasswordMessage(message, type) {
  const messageDiv = document.getElementById('passwordMessage');
  messageDiv.textContent = message;
  messageDiv.style.display = 'block';
  
  if (type === 'success') {
    messageDiv.style.background = 'rgba(16, 185, 129, 0.2)';
    messageDiv.style.color = '#10b981';
    messageDiv.style.borderLeft = '4px solid #10b981';
  } else {
    messageDiv.style.background = 'rgba(239, 68, 68, 0.2)';
    messageDiv.style.color = '#ef4444';
    messageDiv.style.borderLeft = '4px solid #ef4444';
  }
}

