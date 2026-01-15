let token = localStorage.getItem('token');
let currentUser = localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser')) : null;
let unlimitedInfo = null;
let books = [];
const DISCORD_INVITE_URL = 'https://discord.gg/7TrBn3wBf5'; // TODO: Replace with your actual invite link

// Buy credits config - loaded from API
let CHECK_PACKAGES = [
  { id: 'pack-1', label: '1 Check', checks: 1, priceUsd: 4 },
  { id: 'pack-5', label: '5 Checks', checks: 5, priceUsd: 15 },
  { id: 'pack-10', label: '10 Checks', checks: 10, priceUsd: 30 },
  { id: 'pack-20', label: '20 Checks', checks: 20, priceUsd: 50 },
  { id: 'pack-50', label: '50 Checks', checks: 50, priceUsd: 120 },
  { id: 'pack-100', label: '100 Checks', checks: 100, priceUsd: 220 },
  { id: 'unlimited-1w', label: 'Unlimited 1 Week (3 checks/day)', checks: 3, priceUsd: 30, isUnlimited: true },
  { id: 'unlimited-1m', label: 'Unlimited 1 Month (10 checks/day)', checks: 10, priceUsd: 120, isUnlimited: true }
];

const PAYMENT_METHODS = {
  paypal: {
    label: 'PayPal (Friends & Family)',
    summary: 'Send using Friends & Family. Do not add any note.',
    details: `
    <p style="margin: 0 0 0.5rem 0; user-select: text;">PayPal link: <a href="https://paypal.me/HooRaa" target="_blank" rel="noopener" style="color: var(--primary); font-weight: 700; user-select: text;">paypal.me/HooRaa</a></p>
    <p style="margin: 0 0 0.5rem 0; user-select: text;">Send via <strong>Friends & Family</strong> only. Do not write any note/reference.</p>
    <p style="margin: 0; color: #ef4444; font-weight: 600; user-select: text;">If Friends & Family is not available, tell us first. Do NOT pay as goods/services.</p>`
  },
  crypto: {
    label: 'Crypto',
    summary: 'USDT (TRC20), Bitcoin, or Binance Pay. Network must match.',
    options: [
      { id: 'usdt-trc20', label: 'USDT (TRC20)', address: 'TYp3UJWq1RkAMFJwHw3Ni61gCVHfMydpbc' },
      { id: 'btc', label: 'Bitcoin', address: 'bc1qt882udhrzpym7nss5trzq4f08wdn2ym2ajyamt' },
      { id: 'binance', label: 'Binance Pay', address: '584815333' }
    ],
    details: `
    <p style="margin: 0 0 0.5rem 0; user-select: text;">Select network above. Network must match the wallet.</p>
    <p style="margin: 0 0 0.5rem 0; user-select: text;">Binance ID: <strong style="user-select: text;">584815333</strong></p>
    <p style="margin: 0; color: #ef4444; font-weight: 600; user-select: text;">Crypto payments are irreversible. Sending to the wrong address or network will result in loss of funds.</p>`
  },
  card: {
    label: 'Debit/Credit (Binance Gift Card)',
    summary: 'Buy a Binance USDT gift card and send the redeem code.',
    details: `
    <p style="margin: 0 0 0.5rem 0; user-select: text;">Purchase a Binance gift card (USDT). Example vendors:</p>
    <ul style="margin: 0 0 0.75rem 0; padding-left: 1.1rem; user-select: text;">
      <li style="user-select: text;"><a href="https://www.eneba.com/binance-binance-gift-card-usdt-3-usd-key-global" target="_blank" rel="noopener" style="color: var(--primary); user-select: text;">Eneba</a></li>
      <li style="user-select: text;"><a href="https://driffle.com/binance-usdt-3-usd-gift-card-digital-code-p9886854" target="_blank" rel="noopener" style="color: var(--primary); user-select: text;">Driffle</a></li>
    </ul>
    <p style="margin: 0; user-select: text;">After purchase, create a ticket and share the redeem code. Admin will verify and send a credit redeem code back.</p>`
  }
};

// Check if user is logged in
if (!token) {
  window.location.href = 'login.html';
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  displayUserInfo();
  loadBooks();
  loadPackages();
  setupTabButtons();
  checkServiceStatus();
  setupPasswordChangeForm();
  setupBuyFlow();
  loadTickets();
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
    
    // Calculate ETA (20 minutes from creation)
    const createdTime = new Date(order.createdAt).getTime();
    const eta = createdTime + (20 * 60 * 1000);
    const now = new Date().getTime();
    const remainingMs = eta - now;
    const remainingMins = Math.floor(Math.max(0, remainingMs) / 60000);
    const remainingSecs = Math.floor((Math.max(0, remainingMs) % 60000) / 1000);
    
    // User file link
    const userFileUrl = order.userFile && (order.userFile.url || order.userFile.secure_url || order.userFile.path);
    const userFileName = order.userFile && order.userFile.filename ? order.userFile.filename : 'No file';
    const userFileLink = userFileUrl
      ? `<a href="${userFileUrl}" target="_blank" rel="noopener" download style="color: #ffffff; text-decoration: none; font-weight: 600;">📥 User File</a>`
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
          <span class="status-badge ${statusClass}" style="font-size: 0.85rem; padding: 0.4rem 0.8rem; display: flex; align-items: center; gap: 0.4rem; background: ${order.status === 'failed' ? '#ef4444' : (order.status === 'completed' ? '#10b981' : '#f59e0b')}; color: #ffffff; border-radius: 6px;">${order.status === 'pending' ? `<img src="https://cdn.discordapp.com/emojis/1240447270634389568.gif" alt="processing" style="width: 20px; height: 20px;">processing` : order.status}</span>
        </div>

        <!-- Price and Date -->
        <div style="display: flex; justify-content: space-between; align-items: center; color: #6b7280; font-size: 0.9rem; margin-bottom: 1.2rem; padding-bottom: 1rem; border-bottom: 1px solid #e5e7eb;">
          <span><strong>${order.checksUsed}</strong> Credits</span>
          <div style="text-align: right;">
            <div>${date} • ${time}</div>
            ${order.userFile ? `<div style="font-size: 0.85rem; color: #6366f1; font-weight: 500; margin-top: 0.3rem; word-break: break-word; word-wrap: break-word; overflow-wrap: break-word;">📄 ${userFileName}</div>` : ''}
          </div>
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
            <p style="margin: 0; font-size: 0.9rem; font-weight: 500;"><img src="https://media.discordapp.net/stickers/1461336117243543614.png" alt="clock" style="width: 20px; height: 20px; vertical-align: middle; margin-right: 4px;"> ETA: <strong id="countdown-${order._id}" data-order-id="${order._id}" data-created-at="${order.createdAt}">${remainingMins} min${remainingMins !== 1 ? 's' : ''} ${remainingSecs} sec${remainingSecs !== 1 ? 's' : ''}</strong></p>
          </div>
        `)}      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
  
  // Initialize countdown timers for all orders
  initializeCountdownTimers();
}

// Store active countdown timers
let activeCountdowns = {};

function initializeCountdownTimers() {
  // Clear all existing countdowns
  Object.values(activeCountdowns).forEach(timeoutId => clearTimeout(timeoutId));
  activeCountdowns = {};
  
  const countdowns = document.querySelectorAll('[id^="countdown-"]');
  countdowns.forEach(el => {
    const createdAt = el.getAttribute('data-created-at');
    const orderId = el.getAttribute('data-order-id');
    
    if (!createdAt || !orderId) return;
    
    const createdTime = new Date(createdAt).getTime();
    const eta = createdTime + (20 * 60 * 1000);
    
    function updateCountdown() {
      const now = new Date().getTime();
      const remainingMs = eta - now;
      const remainingMins = Math.floor(Math.max(0, remainingMs) / 60000);
      const remainingSecs = Math.floor((Math.max(0, remainingMs) % 60000) / 1000);
      const element = document.getElementById('countdown-' + orderId);
      
      // Stop if element no longer exists in DOM
      if (!element) {
        if (activeCountdowns[orderId]) {
          clearTimeout(activeCountdowns[orderId]);
          delete activeCountdowns[orderId];
        }
        return;
      }
      
      if (remainingMs <= 0) {
        // Time expired - show error message
        const parentDiv = element.closest('div');
        if (parentDiv) {
          parentDiv.style.background = '#fee2e2';
          parentDiv.style.borderColor = '#fca5a5';
          parentDiv.style.color = '#7f1d1d';
        }
        element.textContent = 'Please refresh the page! If it still persists either the server is offline or there is a problem, contact support!';
        element.style.color = '#7f1d1d';
        element.style.fontWeight = '600';
        delete activeCountdowns[orderId];
      } else {
        element.textContent = remainingMins + ' min' + (remainingMins !== 1 ? 's' : '') + ' ' + remainingSecs + ' sec' + (remainingSecs !== 1 ? 's' : '');
        activeCountdowns[orderId] = setTimeout(updateCountdown, 1000);
      }
    }
    
    updateCountdown();
  });
}

// Load packages from API
async function loadPackages() {
  try {
    const response = await fetch('/api/packages');
    const data = await response.json();
    if (response.ok && data.length > 0) {
      CHECK_PACKAGES = data;
      if (selectedPackageId && !CHECK_PACKAGES.find(p => p.id === selectedPackageId)) {
        selectedPackageId = CHECK_PACKAGES[0].id;
      }
      renderPackageCards();
    }
  } catch (error) {
    console.error('Error loading packages:', error);
  }
}

// --- Buy Credits: ticket workflow ---
let selectedPackageId = null;
let selectedPaymentMethod = 'paypal';
let selectedPaymentOption = '';

function setupBuyFlow() {
  renderPackageCards();
  renderPaymentMethods();
  updatePaymentDetails();

  const createBtn = document.getElementById('createTicketBtn');
  if (createBtn) {
    createBtn.addEventListener('click', createTicket);
  }

  const refreshBtn = document.getElementById('refreshTicketsBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadTickets);
  }
}

function renderPackageCards() {
  const container = document.getElementById('buyPackages');
  if (!container) return;
  container.innerHTML = '';

  if (!CHECK_PACKAGES || CHECK_PACKAGES.length === 0) {
    container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 1rem;">Loading packages...</p>';
    return;
  }

  // Initialize selectedPackageId if not set
  if (!selectedPackageId || !CHECK_PACKAGES.find(p => p.id === selectedPackageId)) {
    selectedPackageId = CHECK_PACKAGES[0].id;
  }

  CHECK_PACKAGES.forEach(pkg => {
    const card = document.createElement('label');
    card.style.cssText = `display: flex; justify-content: space-between; align-items: center; padding: 0.9rem 1rem; border: 2px solid ${pkg.id === selectedPackageId ? '#10b981' : '#e5e7eb'}; border-radius: 10px; cursor: pointer; gap: 1rem; background: ${pkg.id === selectedPackageId ? '#f0fdf4' : '#fff'}; box-shadow: 0 4px 12px rgba(0,0,0,0.04); transition: all 0.2s ease; user-select: none;`;

    card.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.75rem; flex: 1;">
        <input type="radio" name="package" value="${pkg.id}" ${pkg.id === selectedPackageId ? 'checked' : ''} style="accent-color: #10b981; width: 20px; height: 20px; min-width: 20px; cursor: pointer;">
        <div style="user-select: text;">
          <div style="font-weight: 700; color: #1f2937; user-select: text;">${pkg.label}</div>
          <div style="color: #475569; font-size: 0.9rem; font-weight: 600; user-select: text;">USD $${pkg.priceUsd.toFixed(2)}</div>
        </div>
      </div>
      <span style="background: linear-gradient(135deg, #6366f1 0%, #06b6d4 100%); color: white; padding: 0.35rem 0.65rem; border-radius: 8px; font-weight: 700; font-size: 0.9rem; user-select: text;">${pkg.checks} ${pkg.isUnlimited ? 'daily' : 'credits'}</span>
    `;

    card.querySelector('input').addEventListener('change', () => {
      selectedPackageId = pkg.id;
      renderPackageCards();
    });

    container.appendChild(card);
  });
}

function renderPaymentMethods() {
  const container = document.getElementById('paymentMethods');
  if (!container) return;
  container.innerHTML = '';

  Object.entries(PAYMENT_METHODS).forEach(([key, data]) => {
    const btn = document.createElement('button');
    btn.className = 'btn-secondary';
    btn.style.cssText = `width: 100%; text-align: left; display: block; padding: 0.9rem 1rem; border-radius: 10px; border: 2px solid ${selectedPaymentMethod === key ? '#10b981' : '#e5e7eb'}; background: ${selectedPaymentMethod === key ? '#f0fdf4' : '#fff'}; transition: all 0.2s ease;`;
    btn.innerHTML = `<div style="display:flex; justify-content: space-between; align-items: center; gap: 0.5rem;"><div style="user-select: text;"><strong style="color: #1f2937; user-select: text;">${data.label}</strong><div style="color: #475569; font-size: 0.9rem; margin-top: 0.15rem; font-weight: 500; user-select: text;">${data.summary}</div></div><span style="color: ${selectedPaymentMethod === key ? '#10b981' : '#cbd5e1'}; font-size: 1.2rem;">●</span></div>`;

    btn.addEventListener('click', () => {
      selectedPaymentMethod = key;
      if (key !== 'crypto') {
        selectedPaymentOption = '';
        document.getElementById('paymentOptions').style.display = 'none';
      } else {
        // Ensure first option is selected when switching to crypto
        if (!selectedPaymentOption) {
          selectedPaymentOption = PAYMENT_METHODS.crypto.options[0].id;
        }
        renderPaymentOptions('crypto');
      }
      renderPaymentMethods();
      updatePaymentDetails();
    });

    container.appendChild(btn);
  });
}

function renderPaymentOptions(methodKey) {
  const wrapper = document.getElementById('paymentOptions');
  if (!wrapper) return;
  if (methodKey !== 'crypto') {
    wrapper.style.display = 'none';
    return;
  }

  const crypto = PAYMENT_METHODS.crypto;
  wrapper.style.display = 'block';
  
  // Default to first option if none selected
  if (!selectedPaymentOption) {
    selectedPaymentOption = crypto.options[0].id;
  }
  
  wrapper.innerHTML = '<p style="margin: 0 0 0.5rem 0; color: var(--text-primary); font-weight: 600; user-select: text;">Choose network (Required)</p>';

  crypto.options.forEach(opt => {
    const optEl = document.createElement('label');
    optEl.style.cssText = 'display: flex; align-items: center; gap: 0.6rem; padding: 0.45rem 0; cursor: pointer; user-select: text;';
    optEl.innerHTML = `<input type="radio" name="paymentOption" value="${opt.id}" ${selectedPaymentOption === opt.id ? 'checked' : ''} style="accent-color: #10b981; width: 18px; height: 18px; cursor: pointer;"> <span style="color: var(--text-secondary); user-select: text;">${opt.label}</span>`;
    optEl.querySelector('input').addEventListener('change', () => {
      selectedPaymentOption = opt.id;
      updatePaymentDetails();
    });
    wrapper.appendChild(optEl);
  });
}

function updatePaymentDetails() {
  const detailsDiv = document.getElementById('paymentDetails');
  if (!detailsDiv) return;

  const method = PAYMENT_METHODS[selectedPaymentMethod];
  if (!method) {
    detailsDiv.innerHTML = '<p style="user-select: text;">Select a payment method to view instructions.</p>';
    return;
  }

  if (selectedPaymentMethod === 'crypto') {
    const opt = (method.options || []).find(o => o.id === selectedPaymentOption) || method.options[0];
    selectedPaymentOption = opt.id;
    detailsDiv.innerHTML = `
      <p style="margin: 0 0 0.4rem 0; font-weight: 700; color: var(--text-primary); user-select: text;">${opt.label} address</p>
      <p style="margin: 0 0 0.6rem 0; word-break: break-all; font-family: monospace; background: rgba(255,255,255,0.6); padding: 0.6rem; border-radius: 8px; user-select: text;">${opt.address}</p>
      <div style="user-select: text;">${method.details}</div>
    `;
    return;
  }

  detailsDiv.innerHTML = `<div style="user-select: text;">${method.details}</div>`;
}

async function createTicket() {
  const pkg = CHECK_PACKAGES.find(p => p.id === selectedPackageId);
  if (!pkg) {
    showMessage('Please select a package', 'error');
    return;
  }

  if (!selectedPaymentMethod) {
    showMessage('Please choose a payment method', 'error');
    return;
  }

  if (selectedPaymentMethod === 'crypto' && !selectedPaymentOption) {
    showMessage('Please choose a crypto network', 'error');
    return;
  }

  // Require screenshot before creating ticket
  const fileInput = document.getElementById('ticketProofUpload');
  if (!fileInput || !fileInput.files || !fileInput.files.length) {
    showMessage('Please upload payment screenshot before creating ticket', 'error');
    return;
  }

  const note = document.getElementById('ticketNote')?.value || '';

  // Show confirmation alert
  const confirmMsg = `Creating ticket for ${pkg.label} ($${pkg.priceUsd}) via ${selectedPaymentMethod.toUpperCase()}${selectedPaymentOption ? ' - ' + selectedPaymentOption : ''}. Please ensure payment is completed before uploading screenshot.`;
  if (!confirm(confirmMsg)) {
    return;
  }

  // Show progress
  const progressDiv = document.getElementById('ticketUploadProgress');
  const progressBar = document.getElementById('ticketUploadProgressBar');
  if (progressDiv && progressBar) {
    progressDiv.style.display = 'block';
    progressBar.style.width = '10%';
  }

  try {
    // Create ticket first
    if (progressBar) progressBar.style.width = '30%';
    const response = await fetch('/api/tickets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        packageLabel: pkg.label,
        checksRequested: pkg.checks,
        priceUsd: pkg.priceUsd,
        paymentMethod: selectedPaymentMethod,
        paymentOption: selectedPaymentOption,
        userNote: note
      })
    });

    const data = await response.json();
    if (!response.ok) {
      showMessage(data.message || 'Could not create ticket', 'error');
      return;
    }

    // Upload screenshot immediately
    if (progressBar) progressBar.style.width = '60%';
    const ticketId = data.ticket._id;
    const formData = new FormData();
    formData.append('proof', fileInput.files[0]);

    const uploadResponse = await fetch(`/api/tickets/${ticketId}/proof`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });

    if (progressBar) progressBar.style.width = '90%';
    const uploadData = await uploadResponse.json();
    if (uploadResponse.ok) {
      if (progressBar) progressBar.style.width = '100%';
      alert('✅ Success! Ticket created with payment proof. Admin will review your payment and send a redeem code in the remarks section.');
      showMessage('Ticket created with payment proof. Admin will review and send redeem code.', 'success');
      fileInput.value = '';
      document.getElementById('ticketNote').value = '';
      if (progressDiv) progressDiv.style.display = 'none';
      loadTickets();
    } else {
      if (progressDiv) progressDiv.style.display = 'none';
      alert('⚠️ Warning: Ticket created but screenshot upload failed. Please try uploading again from your ticket.');
      showMessage('Ticket created but screenshot upload failed: ' + uploadData.message, 'error');
      loadTickets();
    }
  } catch (error) {
    if (progressDiv) progressDiv.style.display = 'none';
    alert('❌ Error: ' + error.message);
    showMessage('Error creating ticket: ' + error.message, 'error');
  }
}

async function loadTickets() {
  try {
    const response = await fetch('/api/tickets/my', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    if (response.ok) {
      displayTickets(Array.isArray(data) ? data : []);
    } else {
      showMessage(data.message || 'Could not load tickets', 'error');
    }
  } catch (error) {
    showMessage('Error loading tickets: ' + error.message, 'error');
  }
}

function displayTickets(tickets) {
  const container = document.getElementById('ticketsContainer');
  if (!container) return;

  if (!tickets.length) {
    container.innerHTML = '<div class="empty-state" style="user-select: text;"><h2 style="user-select: text;">No tickets yet</h2><p style="user-select: text;">Choose a package above to create your first ticket.</p></div>';
    return;
  }

  const statusColors = {
    pending: '#f59e0b',
    submitted: '#3b82f6',
    completed: '#10b981',
    failed: '#ef4444'
  };

  let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1rem;">';

  tickets.forEach(ticket => {
    const statusColor = statusColors[ticket.status] || '#64748b';
    // Display 'Processing' instead of 'submitted'
    const displayStatus = ticket.status === 'submitted' ? 'Processing' : ticket.status;
    const proofUrl = ticket.paymentProof && (ticket.paymentProof.url || ticket.paymentProof.secure_url);
    const optLabel = ticket.paymentOption ? ` • ${ticket.paymentOption}` : '';

    html += `
      <div style="background: white; border: 2px solid ${ticket.status === 'completed' ? '#10b981' : ticket.status === 'failed' ? '#ef4444' : '#e5e7eb'}; border-radius: 12px; padding: 1.25rem; box-shadow: 0 6px 16px rgba(0,0,0,0.08); transition: all 0.2s ease; cursor: default;" onmouseenter="this.style.boxShadow='0 8px 24px rgba(0,0,0,0.12)'" onmouseleave="this.style.boxShadow='0 6px 16px rgba(0,0,0,0.08)'">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem;">
          <div style="user-select: text;">
            <div style="font-weight: 700; color: #1f2937; font-size: 1.05rem; user-select: text;">${ticket.packageLabel}</div>
            <div style="color: #475569; font-size: 0.9rem; font-weight: 600; margin-top: 0.2rem; user-select: text;">${ticket.checksRequested} credits • $${Number(ticket.priceUsd || 0).toFixed(2)}</div>
          </div>
          <span style="padding: 0.4rem 0.75rem; border-radius: 999px; background: ${statusColor}; color: white; font-weight: 700; font-size: 0.85rem; text-transform: capitalize; user-select: text;">${displayStatus}</span>
        </div>
        <div style="background: #f9fafb; padding: 0.75rem; border-radius: 8px; margin-bottom: 0.75rem;">
          <p style="margin: 0 0 0.4rem 0; color: #334155; font-size: 0.9rem; font-weight: 500; user-select: text;"><strong>Payment:</strong> ${ticket.paymentMethod}${optLabel}</p>
          ${ticket.userNote ? `<p style="margin: 0; color: #475569; font-size: 0.9rem; user-select: text;"><strong>Note:</strong> ${ticket.userNote}</p>` : ''}
        </div>
        ${ticket.adminRemarks ? `<div style="margin: 0 0 0.75rem 0; color: #0f172a; font-weight: 600; padding: 0.75rem; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px;"><strong style="user-select: text;">Admin Response:</strong><br><span style="user-select: text; font-weight: 500; margin-top: 0.25rem; display: block;">${ticket.adminRemarks}</span></div>` : ''}
        ${proofUrl ? `<a href="${proofUrl}" target="_blank" rel="noopener" style="display: inline-flex; align-items: center; gap: 0.4rem; color: #6366f1; font-weight: 700; text-decoration: underline; font-size: 0.95rem; user-select: text;">📎 View Payment Proof</a>` : '<p style="margin: 0 0 0.75rem 0; color: #ef4444; font-weight: 700; font-size: 0.95rem; user-select: text;">⚠️ Payment proof required</p>'}
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

async function uploadTicketProof(ticketId, inputEl) {
  if (!inputEl.files || !inputEl.files.length) return;
  const file = inputEl.files[0];
  const formData = new FormData();
  formData.append('proof', file);

  try {
    const response = await fetch(`/api/tickets/${ticketId}/proof`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    const data = await response.json();
    if (response.ok) {
      showMessage('Payment proof uploaded. Awaiting admin review.', 'success');
      loadTickets();
    } else {
      showMessage(data.message || 'Could not upload proof', 'error');
    }
  } catch (error) {
    showMessage('Error uploading proof: ' + error.message, 'error');
  } finally {
    inputEl.value = '';
  }
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
      displayServiceStatusNotice(data.isOnline, data.message || '');
    }
  } catch (error) {
    console.error('Error checking service status:', error);
  }
}

function displayServiceStatusNotice(isOnline, customMessage = '') {
  const notice = document.getElementById('serviceStatusNotice');
  
  if (!notice) return;
  
  notice.style.display = 'block';
  
  if (isOnline) {
    const message = customMessage ? `All services are online. ${customMessage}` : 'All services are online.';
    notice.innerHTML = '<img src="https://cdn.discordapp.com/emojis/1437360640409866240.gif" alt="Online" style="width: 28px; height: 28px; vertical-align: middle; margin-right: 10px;">' + message;
    notice.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.2) 100%)';
    notice.style.color = '#10b981';
    notice.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    notice.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.2)';
  } else {
    const message = customMessage ? `We are currently offline. ${customMessage}` : 'We are currently offline. Please wait until we are back in a few hours.';
    notice.innerHTML = '<img src="https://cdn.discordapp.com/emojis/1043080375649447936.gif" alt="Offline" style="width: 28px; height: 28px; vertical-align: middle; margin-right: 10px;">' + message;
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

