let token = localStorage.getItem('token');
let currentUser = localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser')) : null;
let allOrders = [];
let allUsers = [];
let allUnlimitedUsers = [];
let allTickets = [];
let lastPendingOrderCount = 0;
let lastPendingTicketCount = 0;
let orderCheckInterval = null;
let ticketCheckInterval = null;
let showOnlyPositiveChecks = false;

function toggleChecksFilter() {
  const checkbox = document.getElementById('checksGreaterThanZero');
  showOnlyPositiveChecks = checkbox.checked;
  refreshUsersView();
}

function refreshUsersView() {
  if (Array.isArray(allUsers) && allUsers.length > 0) {
    if (showOnlyPositiveChecks) {
      const filteredUsers = allUsers.filter(user => Number(user.checks) > 0);
      displayAllUsers(filteredUsers);
    } else {
      displayAllUsers(allUsers);
    }
  }
}

// Play notification sound for new orders
function playNotificationSound() {
  try {
    // Resume audio context if suspended (required by some browsers)
    const audioContextClass = window.AudioContext || window.webkitAudioContext;
    const audioContext = new audioContextClass();
    
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    // Create a more noticeable notification pattern with multiple beeps
    const now = audioContext.currentTime;
    const beepDuration = 0.3;
    const beepGap = 0.15;
    const totalDuration = 5; // 5 seconds total
    let currentTime = now;
    
    // Create pattern of beeps for 5 seconds
    while (currentTime - now < totalDuration) {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      
      osc.connect(gain);
      gain.connect(audioContext.destination);
      
      osc.frequency.value = 900; // Hz - higher frequency
      osc.type = 'sine';
      
      // Very loud - 0.7 gain
      gain.gain.setValueAtTime(0.7, currentTime);
      gain.gain.setValueAtTime(0, currentTime + beepDuration);
      
      osc.start(currentTime);
      osc.stop(currentTime + beepDuration);
      
      currentTime += beepDuration + beepGap;
    }
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
}

// Play notification sound for new tickets (different tone pattern)
function playTicketNotificationSound() {
  try {
    // Resume audio context if suspended (required by some browsers)
    const audioContextClass = window.AudioContext || window.webkitAudioContext;
    const audioContext = new audioContextClass();
    
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    // Create a different pattern for ticket alerts - alternating tones for 5 seconds
    const now = audioContext.currentTime;
    const beepDuration = 0.25;
    const beepGap = 0.1;
    const totalDuration = 5; // 5 seconds total
    let currentTime = now;
    let useHighFreq = true;
    
    // Create alternating high-low frequency pattern for 5 seconds
    while (currentTime - now < totalDuration) {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      
      osc.connect(gain);
      gain.connect(audioContext.destination);
      
      // Alternate between two different frequencies for distinct sound
      osc.frequency.value = useHighFreq ? 1100 : 750; // Hz - different from order alerts
      osc.type = 'sine';
      
      // Loud - 0.7 gain
      gain.gain.setValueAtTime(0.7, currentTime);
      gain.gain.setValueAtTime(0, currentTime + beepDuration);
      
      osc.start(currentTime);
      osc.stop(currentTime + beepDuration);
      
      currentTime += beepDuration + beepGap;
      useHighFreq = !useHighFreq; // Toggle frequency for next beep
    }
  } catch (error) {
    console.error('Error playing ticket notification sound:', error);
  }
}

// Show toast notification for new order
function showOrderNotification(count) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%);
    color: white;
    padding: 1.5rem 2rem;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    z-index: 9999;
    font-weight: 600;
    font-size: 1rem;
    animation: slideIn 0.3s ease;
  `;
  
  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 1rem;">
      <span style="font-size: 1.5rem;">🔔</span>
      <div>
        <p style="margin: 0; font-weight: 700;">New Order${count > 1 ? 's' : ''}!</p>
        <p style="margin: 0.25rem 0 0 0; opacity: 0.9; font-size: 0.9rem;">${count} pending order${count > 1 ? 's' : ''} waiting for review</p>
      </div>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

// Show toast notification for new credit ticket
function showTicketNotification(count) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 8rem;
    right: 2rem;
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    color: white;
    padding: 1.5rem 2rem;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    z-index: 9999;
    font-weight: 600;
    font-size: 1rem;
    animation: slideIn 0.3s ease;
  `;
  
  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 1rem;">
      <span style="font-size: 1.5rem;">💳</span>
      <div>
        <p style="margin: 0; font-weight: 700;">New Credit Ticket${count > 1 ? 's' : ''}!</p>
        <p style="margin: 0.25rem 0 0 0; opacity: 0.9; font-size: 0.9rem;">${count} pending ticket${count > 1 ? 's' : ''} waiting for review</p>
      </div>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

// Add animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// Check for new orders periodically
function startOrderMonitoring() {
  if (orderCheckInterval) clearInterval(orderCheckInterval);
  
  orderCheckInterval = setInterval(async () => {
    try {
      const response = await fetch('/api/admin/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) return;
      
      const orders = await response.json();
      const pendingOrders = orders.filter(o => o.status === 'pending').length;
      
      // Update page title with pending orders count
      if (pendingOrders > 0) {
        document.title = `(${pendingOrders}) Admin Dashboard`;
      } else {
        document.title = 'Admin Dashboard';
      }
      
      // Update badge
      const badge = document.getElementById('pendingBadge');
      if (badge) {
        if (pendingOrders > 0) {
          badge.textContent = pendingOrders;
          badge.style.display = 'inline-flex';
        } else {
          badge.style.display = 'none';
        }
      }
      
      // If new pending orders detected, alert admin
      if (pendingOrders > lastPendingOrderCount) {
        const newOrderCount = pendingOrders - lastPendingOrderCount;
        playNotificationSound();
        showOrderNotification(newOrderCount);
      }
      
      lastPendingOrderCount = pendingOrders;
    } catch (error) {
      console.error('Error checking for new orders:', error);
    }
  }, 10000); // Check every 10 seconds
}

// Check for new credit tickets every 10 seconds
function checkForNewTickets() {
  ticketCheckInterval = setInterval(async () => {
    try {
      const response = await fetch('/api/tickets/admin', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) return;
      
      const tickets = await response.json();
      if (!Array.isArray(tickets)) return;
      
      // Count pending and submitted tickets
      const pendingTickets = tickets.filter(t => t.status === 'pending' || t.status === 'submitted').length;
      
      // If new pending tickets detected, alert admin
      if (pendingTickets > lastPendingTicketCount) {
        const newTicketCount = pendingTickets - lastPendingTicketCount;
        playTicketNotificationSound();
        showTicketNotification(newTicketCount);
      }
      
      lastPendingTicketCount = pendingTickets;
    } catch (error) {
      console.error('Error checking for new tickets:', error);
    }
  }, 10000); // Check every 10 seconds
}

// Check if user is admin
if (!token || !currentUser || !currentUser.isAdmin) {
  window.location.href = '/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  displayAdminInfo();
  setupTabButtons();
  loadAllOrders();
  loadTicketsAdmin();
  loadAllUsers();
  loadPackagesAdmin();
  
  // Start checking for new tickets
  checkForNewTickets();
  loadUnlimitedUsers();

  loadCodes();
  startOrderMonitoring();

  const form = document.getElementById('generateCodeForm');
  if (form) {
    form.addEventListener('submit', createRedemptionCode);
  }
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

  if (tabName === 'codes') {
    loadCodes();
  } else if (tabName === 'status') {
    loadServiceStatus();
  } else if (tabName === 'unlimited') {
    loadUnlimitedUsers();
  } else if (tabName === 'tickets') {
    loadTicketsAdmin();
  }
}

function displayAdminInfo() {
  document.getElementById('adminName').textContent = currentUser.username;
}

async function loadAllOrders() {
  try {
    const response = await fetch('/api/admin/orders', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    if (!response.ok || !Array.isArray(data)) {
      const msg = (data && data.message) ? data.message : `Unable to load orders (${response.status})`;
      console.error('Admin orders fetch failed:', { status: response.status, data });
      showMessage(msg, 'error');
      if (response.status === 401 || response.status === 403) {
        // Token invalid or not admin; redirect to login for clarity
        setTimeout(() => window.location.href = '/login.html', 1500);
      }
      return;
    }
    allOrders = data;
    displayAllOrders(data);
    refreshUsersView();
  } catch (error) {
    console.error('Admin orders fetch error:', error);
    showMessage('Error loading orders', 'error');
  }
}

function displayAllOrders(orders) {
  const container = document.getElementById('allOrdersContainer');
  
  if (orders.length === 0) {
    container.innerHTML = '<div class="empty-state"><h2>No orders</h2></div>';
    return;
  }

  let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 1.5rem; margin-top: 1.5rem;">';

  orders.forEach(order => {
    const statusClass = order.status === 'completed' ? 'status-completed' : (order.status === 'failed' ? 'status-failed' : 'status-pending');
    const orderDateTime = new Date(order.createdAt);
    const date = orderDateTime.toLocaleDateString();
    const time = orderDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userName = order.user && (order.user.username || order.user.email) ? (order.user.username || order.user.email) : 'Unknown User';
    const bookTitle = order.book && order.book.title ? order.book.title : 'Unknown Service';
    const userEmail = order.user && order.user.email ? order.user.email : 'N/A';
    
    // File status indicators
    const userFileStatus = order.userFile ? '✓' : '✗';
    const aiReportStatus = order.adminFiles && order.adminFiles.aiReport ? '✓' : '✗';
    const similarityReportStatus = order.adminFiles && order.adminFiles.similarityReport ? '✓' : '✗';
    
    // File URLs
    const userFileUrl = order.userFile && (order.userFile.url || order.userFile.secure_url || order.userFile.path);
    const userFileName = order.userFile && order.userFile.filename ? order.userFile.filename : 'No file';
    const aiReportUrl = order.adminFiles && order.adminFiles.aiReport && (order.adminFiles.aiReport.url || order.adminFiles.aiReport.secure_url);
    const similarityUrl = order.adminFiles && order.adminFiles.similarityReport && (order.adminFiles.similarityReport.url || order.adminFiles.similarityReport.secure_url);

    html += `
      <div style="background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); border: 2px solid #e5e7eb; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
          <div style="flex: 1;">
            <h3 style="color: #1f2937; font-size: 1.05rem; margin: 0 0 0.3rem 0; font-weight: 700;">${bookTitle}</h3>
            <code style="background: #f0f0f0; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.7rem; color: #666;">${order._id}</code>
          </div>
          <span class="status-badge ${statusClass}" style="font-size: 0.8rem; padding: 0.4rem 0.8rem;">${order.status}</span>
        </div>

        <!-- User Info -->
        <div style="background: #f3f4f6; border-radius: 8px; padding: 0.8rem 1rem; margin-bottom: 1rem;">
          <p style="margin: 0; color: #666; font-size: 0.85rem;"><strong>User:</strong> ${userName}</p>
          <p style="margin: 0.3rem 0 0 0; color: #666; font-size: 0.85rem;"><strong>Email:</strong> ${userEmail}</p>
          <p style="margin: 0.3rem 0 0 0; color: #666; font-size: 0.85rem;"><strong>Credits:</strong> ${order.checksUsed}</p>
          <p style="margin: 0.3rem 0 0 0; color: #666; font-size: 0.85rem;"><strong>Date & Time:</strong> ${date} at ${time}</p>
          ${order.userFile ? `<p style="margin: 0.3rem 0 0 0; color: #6366f1; font-size: 0.85rem; font-weight: 500;"><strong>📄 User File:</strong> <span style="word-break: break-word; word-wrap: break-word; overflow-wrap: break-word;">${userFileName}</span></p>` : ''}
        </div>

        <!-- Files Status -->
        <div style="background: #f9fafb; border-radius: 8px; padding: 0.8rem 1rem; margin-bottom: 1rem;">
          <p style="margin: 0 0 0.5rem 0; color: #1f2937; font-weight: 600; font-size: 0.9rem;">📁 Files Status</p>
          <div style="display: flex; gap: 0.8rem; font-size: 0.85rem;">
            <div style="flex: 1;">
              <span style="color: ${userFileStatus === '✓' ? '#10b981' : '#ef4444'}; font-weight: 600;">User File: ${userFileStatus}</span>
            </div>
            <div style="flex: 1;">
              <span style="color: ${aiReportStatus === '✓' ? '#10b981' : '#ef4444'}; font-weight: 600;">AI Report: ${aiReportStatus}</span>
            </div>
            <div style="flex: 1;">
              <span style="color: ${similarityReportStatus === '✓' ? '#10b981' : '#ef4444'}; font-weight: 600;">Similarity: ${similarityReportStatus}</span>
            </div>
          </div>
        </div>

        ${order.status === 'failed' ? `
        <!-- Failure Details -->
        <div style="padding: 0.9rem 1rem; background: #fee2e2; border: 1px solid #fca5a5; border-radius: 8px; color: #7f1d1d; margin-bottom: 1rem;">
          <p style="margin: 0 0 0.4rem 0; font-size: 0.9rem; font-weight: 700;">❌ Order Failed</p>
          <p style="margin: 0; font-size: 0.9rem;">Reason: <strong>${order.failureReason || 'Not specified'}</strong></p>
          <p style="margin: 0.4rem 0 0 0; font-size: 0.9rem; color: #1f2937;">💎 Credits Refunded: <strong>${order.refundAmount || order.checksUsed}</strong></p>
          ${order.refundedAt ? `<p style="margin: 0.2rem 0 0 0; font-size: 0.85rem; color: #6b7280;">Refunded: ${new Date(order.refundedAt).toLocaleString()}</p>` : ''}
        </div>
        ` : ''}

        <!-- Action Buttons -->
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.8rem; margin-bottom: 0.8rem;">
          ${order.status === 'pending' ? `<button class="btn-success" onclick="markComplete('${order._id}')" style="padding: 0.6rem 1rem; font-size: 0.9rem; border-radius: 8px;">✓ Complete</button>` : '<div></div>'}
          <button class="btn-secondary" onclick="openFileUploadModal('${order._id}')" style="padding: 0.6rem 1rem; font-size: 0.9rem; border-radius: 8px;">📤 Upload</button>
          ${order.status === 'pending' ? `<button class="btn-danger" onclick="markFailed('${order._id}')" style="padding: 0.6rem 1rem; font-size: 0.9rem; border-radius: 8px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #fff; border: none;">✗ Fail</button>` : '<div></div>'}
        </div>

        <!-- Download Links -->
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.6rem;">
          ${userFileUrl ? `<a href="${userFileUrl}" target="_blank" class="btn-secondary" download style="padding: 0.5rem 0.8rem; font-size: 0.8rem; border-radius: 6px; text-align: center; text-decoration: none;">📥 User File</a>` : '<div style="opacity: 0.5; cursor: not-allowed;">📥 User File</div>'}
          ${aiReportUrl ? `<a href="${aiReportUrl}" target="_blank" class="btn-secondary" download style="padding: 0.5rem 0.8rem; font-size: 0.8rem; border-radius: 6px; text-align: center; text-decoration: none;">📊 AI Report</a>` : '<div style="opacity: 0.5; cursor: not-allowed;">📊 AI Report</div>'}
          ${similarityUrl ? `<a href="${similarityUrl}" target="_blank" class="btn-secondary" download style="padding: 0.5rem 0.8rem; font-size: 0.8rem; border-radius: 6px; text-align: center; text-decoration: none;">🔍 Similarity</a>` : '<div style="opacity: 0.5; cursor: not-allowed;">🔍 Similarity</div>'}
        </div>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

async function loadTicketsAdmin() {
  try {
    const response = await fetch('/api/tickets/admin', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    if (response.ok && Array.isArray(data)) {
      allTickets = data;
      displayTicketsAdmin(data);
    } else {
      showMessage((data && data.message) || 'Could not load tickets', 'error');
    }
  } catch (error) {
    console.error('Admin tickets fetch error:', error);
    showMessage('Error loading tickets', 'error');
  }
}

function displayTicketsAdmin(tickets) {
  const container = document.getElementById('ticketsAdminContainer');
  if (!container) return;

  if (!tickets.length) {
    container.innerHTML = '<div class="empty-state"><h2>No tickets</h2><p>No credit tickets submitted yet.</p></div>';
    return;
  }

  const statusColors = {
    pending: '#f59e0b',
    submitted: '#3b82f6',
    completed: '#10b981',
    failed: '#ef4444'
  };

  // Calculate statistics
  const totalTickets = tickets.length;
  const pendingTickets = tickets.filter(t => t.status === 'pending').length;
  const submittedTickets = tickets.filter(t => t.status === 'submitted').length;
  const completedTickets = tickets.filter(t => t.status === 'completed').length;
  const failedTickets = tickets.filter(t => t.status === 'failed').length;
  const completedCredits = tickets.filter(t => t.status === 'completed').reduce((sum, t) => sum + (Number(t.checksRequested) || 0), 0);
  const completedRevenue = tickets.filter(t => t.status === 'completed').reduce((sum, t) => sum + (Number(t.priceUsd) || 0), 0);

  // Display statistics
  let html = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; margin-top: 1rem; margin-bottom: 1.5rem;">
      <div style="background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%); border: 2px solid #e2e8f0; border-radius: 12px; padding: 1rem; text-align: center;">
        <div style="color: #6b7280; font-size: 0.85rem;">Total Tickets</div>
        <div style="color: #1f2937; font-size: 1.3rem; font-weight: 800;">${totalTickets}</div>
      </div>
      <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border: 2px solid #93c5fd; border-radius: 12px; padding: 1rem; text-align: center;">
        <div style="color: #1e40af; font-size: 0.85rem;">Submitted</div>
        <div style="color: #1e40af; font-size: 1.3rem; font-weight: 800;">${submittedTickets}</div>
      </div>
      <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 2px solid #a7f3d0; border-radius: 12px; padding: 1rem; text-align: center;">
        <div style="color: #065f46; font-size: 0.85rem;">Completed</div>
        <div style="color: #065f46; font-size: 1.3rem; font-weight: 800;">${completedTickets}</div>
      </div>
      <div style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border: 2px solid #fca5a5; border-radius: 12px; padding: 1rem; text-align: center;">
        <div style="color: #7f1d1d; font-size: 0.85rem;">Failed</div>
        <div style="color: #7f1d1d; font-size: 1.3rem; font-weight: 800;">${failedTickets}</div>
      </div>
      <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border: 2px solid #6ee7b7; border-radius: 12px; padding: 1rem; text-align: center;">
        <div style="color: #065f46; font-size: 0.85rem;">Completed Revenue</div>
        <div style="color: #065f46; font-size: 1.3rem; font-weight: 800;">$${completedRevenue.toFixed(2)}</div>
      </div>
    </div>
  `;

  html += '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1rem;">';

  tickets.forEach(ticket => {
    const statusColor = statusColors[ticket.status] || '#64748b';
    const proofUrl = ticket.paymentProof && (ticket.paymentProof.url || ticket.paymentProof.secure_url);
    const userName = ticket.user?.username || ticket.user?.email || 'Unknown user';
    const userEmail = ticket.user?.email || 'N/A';
    const createdAt = ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : '';
    const optLabel = ticket.paymentOption ? ` • ${ticket.paymentOption}` : '';

    html += `
      <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1rem; box-shadow: 0 6px 16px rgba(0,0,0,0.06);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem;">
          <div>
            <div style="font-weight: 700; color: #1f2937;">${ticket.packageLabel}</div>
            <div style="color: #475569; font-size: 0.9rem; font-weight: 600;">${ticket.checksRequested} credits • $${Number(ticket.priceUsd || 0).toFixed(2)}</div>
          </div>
          <span style="padding: 0.3rem 0.6rem; border-radius: 999px; background: ${statusColor}1A; color: ${statusColor}; font-weight: 700; font-size: 0.85rem; text-transform: capitalize;">${ticket.status}</span>
        </div>
        <p style="margin: 0 0 0.35rem 0; color: #1f2937; font-size: 0.9rem; font-weight: 600;"><strong>User:</strong> ${userName} (${userEmail})</p>
        <p style="margin: 0 0 0.35rem 0; color: #334155; font-size: 0.9rem; font-weight: 500;"><strong>Payment:</strong> ${ticket.paymentMethod}${optLabel}</p>
        ${ticket.userNote ? `<p style="margin: 0 0 0.35rem 0; color: #475569; font-size: 0.9rem;"><strong>User note:</strong> ${ticket.userNote}</p>` : ''}
        ${ticket.adminRemarks ? `<p style="margin: 0 0 0.35rem 0; color: #0f172a; font-size: 0.9rem; font-weight: 700; background: #f1f5f9; padding: 0.5rem; border-radius: 6px;"><strong>Admin remarks:</strong> ${ticket.adminRemarks}</p>` : ''}
        <p style="margin: 0 0 0.35rem 0; color: #475569; font-size: 0.9rem; font-weight: 500;"><strong>Created:</strong> ${createdAt}</p>
        ${proofUrl ? `<a href="${proofUrl}" target="_blank" rel="noopener" style="display: inline-flex; align-items: center; gap: 0.35rem; color: #6366f1; font-weight: 700; text-decoration: underline; margin-top: 0.4rem;">📎 View Payment Proof</a>` : '<p style="margin: 0 0 0.35rem 0; color: #ef4444; font-weight: 700; font-size: 0.95rem;">⚠️ No payment proof uploaded</p>'}
        <div style="display: flex; gap: 0.5rem; margin-top: 0.8rem;">
          ${ticket.status === 'completed' || ticket.status === 'failed' ? '<span style="color:#64748b; font-size: 0.9rem; font-weight: 600;">Closed</span>' : `
            <button class="btn-success" style="flex:1;" onclick="updateTicketStatus('${ticket._id}','completed')">Mark Completed</button>
            <button class="btn-danger" style="flex:1;" onclick="updateTicketStatus('${ticket._id}','failed')">Mark Failed</button>`}
        </div>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

async function updateTicketStatus(id, status) {
  const message = status === 'completed'
    ? 'Enter remarks (include redeem code for the user)'
    : 'Enter failure reason (visible to user)';
  const adminRemarks = prompt(message) || '';
  if (adminRemarks.trim().length < 3) {
    alert('Please add a clear remark (min 3 characters).');
    return;
  }

  try {
    const response = await fetch(`/api/tickets/admin/${id}/status`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status, adminRemarks })
    });
    const data = await response.json();
    if (response.ok) {
      showMessage(data.message || 'Ticket updated', 'success');
      loadTicketsAdmin();
    } else {
      showMessage(data.message || 'Could not update ticket', 'error');
    }
  } catch (error) {
    showMessage('Error updating ticket: ' + error.message, 'error');
  }
}

async function markFailed(orderId) {
  const reason = prompt('Enter failure reason (visible to user):');
  if (!reason || reason.trim().length < 3) {
    alert('Please enter a clear reason (min 3 characters).');
    return;
  }
  try {
    const response = await fetch(`/api/admin/orders/${orderId}/fail`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ reason })
    });
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const data = isJson ? await response.json() : { message: await response.text() };
    if (response.ok) {
      alert('Order marked as failed and credits refunded');
      showMessage(data.message || 'Order marked as failed and credits refunded', 'success');
      loadAllOrders();
      // Refresh unlimited users if viewing one
      const tab = document.querySelector('[data-tab="unlimited"].active');
      if (tab) {
        loadUnlimitedUsers();
      }
    } else {
      alert(data.message || 'Could not mark as failed');
      showMessage(data.message || 'Could not mark as failed', 'error');
    }
  } catch (error) {
    console.error('Mark failed error:', error);
    alert('Error marking order as failed: ' + error.message);
    showMessage('Error marking order as failed: ' + error.message, 'error');
  }
}

async function loadAllUsers() {
  try {
    const response = await fetch('/api/admin/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const users = await response.json();
    allUsers = Array.isArray(users) ? users : [];
    refreshUsersView();
    
    // Add search listener
    const usersSearchInput = document.getElementById('usersSearchInput');
    if (usersSearchInput) {
      usersSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        filterAndDisplayUsers(query);
      });
    }
  } catch (error) {
    showMessage('Error loading users', 'error');
  }
}

function displayAllUsers(users) {
  const container = document.getElementById('allUsersContainer');
  
  if (users.length === 0) {
    container.innerHTML = '<div class="empty-state"><h2>No users</h2></div>';
    return;
  }

  // Platform stats (from orders)
  const totalUsers = users.length;
  const totalOrders = allOrders.length;
  const completedOrders = allOrders.filter(o => o.status === 'completed').length;
  const failedOrders = allOrders.filter(o => o.status === 'failed').length;
  const pendingOrders = allOrders.filter(o => o.status === 'pending').length;
  const totalUserCredits = users.reduce((sum, u) => sum + (Number(u.checks) || 0), 0);

  let html = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-top: 1rem;">
      <div style="background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%); border: 2px solid #e2e8f0; border-radius: 12px; padding: 1rem; text-align: center;">
        <div style="color: #6b7280; font-size: 0.85rem;">Total Users</div>
        <div style="color: #1f2937; font-size: 1.3rem; font-weight: 800;">${totalUsers}</div>
      </div>
      <div style="background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%); border: 2px solid #e2e8f0; border-radius: 12px; padding: 1rem; text-align: center;">
        <div style="color: #6b7280; font-size: 0.85rem;">Total Orders</div>
        <div style="color: #1f2937; font-size: 1.3rem; font-weight: 800;">${totalOrders}</div>
      </div>
      <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 2px solid #a7f3d0; border-radius: 12px; padding: 1rem; text-align: center;">
        <div style="color: #065f46; font-size: 0.85rem;">Completed</div>
        <div style="color: #065f46; font-size: 1.3rem; font-weight: 800;">${completedOrders}</div>
      </div>
      <div style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border: 2px solid #fca5a5; border-radius: 12px; padding: 1rem; text-align: center;">
        <div style="color: #7f1d1d; font-size: 0.85rem;">Failed</div>
        <div style="color: #7f1d1d; font-size: 1.3rem; font-weight: 800;">${failedOrders}</div>
      </div>
      <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #fcd34d; border-radius: 12px; padding: 1rem; text-align: center;">
        <div style="color: #92400e; font-size: 0.85rem;">Pending</div>
        <div style="color: #92400e; font-size: 1.3rem; font-weight: 800;">${pendingOrders}</div>
      </div>
      <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 2px solid #bfdbfe; border-radius: 12px; padding: 1rem; text-align: center;">
        <div style="color: #1e40af; font-size: 0.85rem;">Total User Credits</div>
        <div style="color: #1e40af; font-size: 1.3rem; font-weight: 800;">${totalUserCredits}</div>
      </div>
    </div>
  `;

  html += '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.5rem; margin-top: 1.5rem;">';

  users.forEach(user => {
    const userDateTime = new Date(user.createdAt);
    const date = userDateTime.toLocaleDateString();
    const time = userDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userOrders = allOrders.filter(o => {
      if (!o.user) return false;
      const orderUserId = typeof o.user === 'object' ? (o.user._id || o.user.id || o.user) : o.user;
      return String(orderUserId) === String(user._id);
    });
    const userTotal = userOrders.length;
    const userCompleted = userOrders.filter(o => o.status === 'completed').length;
    const userFailed = userOrders.filter(o => o.status === 'failed').length;
    const userPending = userOrders.filter(o => o.status === 'pending').length;
    
    html += `
      <div style="background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%); border: 2px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 15px rgba(0,0,0,0.08); transition: all 0.3s ease;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid #e2e8f0;">
          <h3 style="margin: 0; color: #1a202c; font-size: 1.1rem;">${user.username}</h3>
          <span style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 0.4rem 0.8rem; border-radius: 6px; font-weight: 600; font-size: 0.9rem;">${user.checks} Checks</span>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; color: #666;">
            <span style="font-weight: 600; color: #1a202c;">📧 Email:</span>
            <span>${user.email}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem; color: #666;">
            <span style="font-weight: 600; color: #1a202c;">📅 Joined:</span>
            <span>${date} at ${time}</span>
          </div>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem;">
            <span style="background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 6px; padding: 0.35rem 0.5rem; font-size: 0.8rem; color: #1f2937; text-align: center;">Total: <strong>${userTotal}</strong></span>
            <span style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 0.35rem 0.5rem; font-size: 0.8rem; color: #065f46; text-align: center;">Completed: <strong>${userCompleted}</strong></span>
            <span style="background: #fee2e2; border: 1px solid #fca5a5; border-radius: 6px; padding: 0.35rem 0.5rem; font-size: 0.8rem; color: #7f1d1d; text-align: center;">Failed: <strong>${userFailed}</strong></span>
            <span style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px; padding: 0.35rem 0.5rem; font-size: 0.8rem; color: #92400e; text-align: center;">Pending: <strong>${userPending}</strong></span>
          </div>
        </div>
        
        <button class="btn-secondary" onclick="viewUserDetails('${user._id}')" style="width: 100%; padding: 0.7rem; font-size: 0.95rem;">👁️ View Orders</button>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

// Filter and display users based on search query
function filterAndDisplayUsers(query) {
  let usersToFilter = allUsers;
  
  // Apply checks filter first
  if (showOnlyPositiveChecks) {
    usersToFilter = usersToFilter.filter(user => Number(user.checks) > 0);
  }
  
  if (!query) {
    displayAllUsers(usersToFilter);
    return;
  }
  
  const filtered = usersToFilter.filter(user => {
    const username = (user.username || '').toLowerCase();
    const email = (user.email || '').toLowerCase();
    return username.includes(query) || email.includes(query);
  });
  
  displayAllUsersFiltered(filtered);
}

// Download users with credits > 0 or isUnlimited: true
function downloadQualifiedUsers() {
  // Filter users with checks > 0 or isUnlimited: true
  const qualifiedUsers = allUsers.filter(user => {
    const hasCredits = Number(user.checks) > 0;
    const isUnlimited = user.isUnlimited === true;
    return hasCredits || isUnlimited;
  });

  if (qualifiedUsers.length === 0) {
    showMessage('No users found with Credits > 0 or Unlimited access', 'error');
    return;
  }

  // Prepare data for download
  const userData = qualifiedUsers.map(user => {
    const userOrders = allOrders.filter(o => {
      if (!o.user) return false;
      const orderUserId = typeof o.user === 'object' ? (o.user._id || o.user.id || o.user) : o.user;
      return String(orderUserId) === String(user._id);
    });
    
    const unlimitedSettings = user.unlimitedSettings || {};
    const subscriptionStartDate = unlimitedSettings.subscriptionStartDate 
      ? new Date(unlimitedSettings.subscriptionStartDate).toLocaleString()
      : 'N/A';
    const creditsResetAt = unlimitedSettings.creditsResetAt
      ? new Date(unlimitedSettings.creditsResetAt).toLocaleString()
      : 'N/A';
    
    return {
      'User ID': user._id,
      'Username': user.username,
      'Email': user.email,
      'Checks': user.checks,
      'Is Unlimited': user.isUnlimited ? 'Yes' : 'No',
      'Daily Credits': unlimitedSettings.dailyCredits || 0,
      'Daily Credits Used Today': unlimitedSettings.dailyCreditsUsedToday || 0,
      'Subscription Days Remaining': unlimitedSettings.subscriptionDaysRemaining || 0,
      'Subscription Start Date': subscriptionStartDate,
      'Credits Reset At': creditsResetAt,
      'Is Admin': user.isAdmin ? 'Yes' : 'No',
      'Admin Notes': user.adminPrivateNotes || '',
      'Total Orders': userOrders.length,
      'Completed Orders': userOrders.filter(o => o.status === 'completed').length,
      'Failed Orders': userOrders.filter(o => o.status === 'failed').length,
      'Pending Orders': userOrders.filter(o => o.status === 'pending').length,
      'Joined Date': new Date(user.createdAt).toLocaleString()
    };
  });

  // Convert to CSV
  const csv = convertToCSV(userData);
  
  // Trigger download
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `users_qualified_${timestamp}.csv`;
  downloadCSV(csv, filename);
  
  showMessage(`Downloaded ${qualifiedUsers.length} qualified users`, 'success');
}

// Helper function to convert array to CSV
function convertToCSV(data) {
  if (!data || data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const headerRow = headers.map(h => `"${h}"`).join(',');
  
  const rows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      // Escape quotes and wrap in quotes if contains comma or quotes
      const stringValue = String(value).replace(/"/g, '""');
      return `"${stringValue}"`;
    }).join(',');
  });

  return [headerRow, ...rows].join('\n');
}

// Helper function to trigger CSV download
function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function displayAllUsersFiltered(filteredUsers) {
  const container = document.getElementById('allUsersContainer');
  
  if (filteredUsers.length === 0) {
    container.innerHTML = '<div class="empty-state"><h2>No users found</h2></div>';
    return;
  }

  // Platform stats (from ALL users and orders, not filtered)
  const totalUsers = allUsers.length;
  const totalOrders = allOrders.length;
  const completedOrders = allOrders.filter(o => o.status === 'completed').length;
  const failedOrders = allOrders.filter(o => o.status === 'failed').length;
  const pendingOrders = allOrders.filter(o => o.status === 'pending').length;
  const totalUserCredits = allUsers.reduce((sum, u) => sum + (Number(u.checks) || 0), 0);

  let html = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-top: 1rem;">
      <div style="background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%); border: 2px solid #e2e8f0; border-radius: 12px; padding: 1rem; text-align: center;">
        <div style="color: #6b7280; font-size: 0.85rem;">Total Users</div>
        <div style="color: #1f2937; font-size: 1.3rem; font-weight: 800;">${totalUsers}</div>
      </div>
      <div style="background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%); border: 2px solid #e2e8f0; border-radius: 12px; padding: 1rem; text-align: center;">
        <div style="color: #6b7280; font-size: 0.85rem;">Total Orders</div>
        <div style="color: #1f2937; font-size: 1.3rem; font-weight: 800;">${totalOrders}</div>
      </div>
      <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 2px solid #a7f3d0; border-radius: 12px; padding: 1rem; text-align: center;">
        <div style="color: #065f46; font-size: 0.85rem;">Completed</div>
        <div style="color: #065f46; font-size: 1.3rem; font-weight: 800;">${completedOrders}</div>
      </div>
      <div style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border: 2px solid #fca5a5; border-radius: 12px; padding: 1rem; text-align: center;">
        <div style="color: #7f1d1d; font-size: 0.85rem;">Failed</div>
        <div style="color: #7f1d1d; font-size: 1.3rem; font-weight: 800;">${failedOrders}</div>
      </div>
      <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #fcd34d; border-radius: 12px; padding: 1rem; text-align: center;">
        <div style="color: #92400e; font-size: 0.85rem;">Pending</div>
        <div style="color: #92400e; font-size: 1.3rem; font-weight: 800;">${pendingOrders}</div>
      </div>
      <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 2px solid #bfdbfe; border-radius: 12px; padding: 1rem; text-align: center;">
        <div style="color: #1e40af; font-size: 0.85rem;">Total User Credits</div>
        <div style="color: #1e40af; font-size: 1.3rem; font-weight: 800;">${totalUserCredits}</div>
      </div>
    </div>
  `;

  // Display only filtered users
  html += `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.2rem; margin-top: 2rem;">`;
  
  filteredUsers.forEach(user => {
    const date = new Date(user.createdAt).toLocaleDateString();
    const time = new Date(user.createdAt).toLocaleTimeString();
    
    const userOrders = allOrders.filter(o => {
      if (!o.user) return false;
      const orderUserId = typeof o.user === 'object' ? (o.user._id || o.user.id || o.user) : o.user;
      return String(orderUserId) === String(user._id);
    });
    const userTotal = userOrders.length;
    const userCompleted = userOrders.filter(o => o.status === 'completed').length;
    const userFailed = userOrders.filter(o => o.status === 'failed').length;
    const userPending = userOrders.filter(o => o.status === 'pending').length;
    
    html += `
      <div style="background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%); border: 2px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 15px rgba(0,0,0,0.08); transition: all 0.3s ease;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid #e2e8f0;">
          <h3 style="margin: 0; color: #1a202c; font-size: 1.1rem;">${user.username}</h3>
          <span style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 0.4rem 0.8rem; border-radius: 6px; font-weight: 600; font-size: 0.9rem;">${user.checks} Checks</span>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; color: #666;">
            <span style="font-weight: 600; color: #1a202c;">📧 Email:</span>
            <span>${user.email}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem; color: #666;">
            <span style="font-weight: 600; color: #1a202c;">📅 Joined:</span>
            <span>${date} at ${time}</span>
          </div>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem;">
            <span style="background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 6px; padding: 0.35rem 0.5rem; font-size: 0.8rem; color: #1f2937; text-align: center;">Total: <strong>${userTotal}</strong></span>
            <span style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 0.35rem 0.5rem; font-size: 0.8rem; color: #065f46; text-align: center;">Completed: <strong>${userCompleted}</strong></span>
            <span style="background: #fee2e2; border: 1px solid #fca5a5; border-radius: 6px; padding: 0.35rem 0.5rem; font-size: 0.8rem; color: #7f1d1d; text-align: center;">Failed: <strong>${userFailed}</strong></span>
            <span style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px; padding: 0.35rem 0.5rem; font-size: 0.8rem; color: #92400e; text-align: center;">Pending: <strong>${userPending}</strong></span>
          </div>
        </div>
        
        <button class="btn-secondary" onclick="viewUserDetails('${user._id}')" style="width: 100%; padding: 0.7rem; font-size: 0.95rem;">👁️ View Orders</button>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

async function viewUserDetails(userId) {
  try {
    const response = await fetch(`/api/admin/users/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    displayUserDetailsModal(data);
  } catch (error) {
    showMessage('Error loading user details', 'error');
  }
}

function displayUserDetailsModal(data) {
  const { user, orders, totalOrdersCount, completedOrdersCount } = data;
  const failedOrdersCount = orders.filter(o => o.status === 'failed').length;
  const pendingOrdersCount = totalOrdersCount - completedOrdersCount - failedOrdersCount;
  
  let ordersHtml = '';
  if (orders.length === 0) {
    ordersHtml = '<p style="color: #666;">No orders</p>';
  } else {
    ordersHtml = '<ul style="list-style: none; padding: 0;">';
    orders.forEach(order => {
      const failedBlock = order.status === 'failed'
        ? `<div style="margin-top: 0.5rem; padding: 0.6rem 0.8rem; background: #fee2e2; border: 1px solid #fca5a5; border-radius: 6px; color: #7f1d1d; font-size: 0.85rem;">
             <div style="font-weight: 700; margin-bottom: 0.2rem;">❌ Failed</div>
             <div>Reason: <strong>${order.failureReason || 'Not specified'}</strong></div>
             <div style="color: #1f2937;">Refunded: <strong>${order.refundAmount || order.checksUsed}</strong> ${order.refundedAt ? `on ${new Date(order.refundedAt).toLocaleString()}` : ''}</div>
           </div>`
        : '';

      ordersHtml += `
        <li style="margin-bottom: 0.75rem; padding: 1rem; background: #f8f9fa; border-radius: 8px; color: #1f2937; border: 1px solid #e5e7eb;">
          <div style="font-weight: 600; color: #1f2937; margin-bottom: 0.25rem;">${order.book.title}</div>
          <div style="font-size: 0.9rem; color: #6b7280;">
            <span style="color: #10b981; font-weight: 600;">${order.checksUsed} Credits</span> • 
            <span style="color: ${order.status === 'completed' ? '#10b981' : (order.status === 'failed' ? '#ef4444' : '#f59e0b')}; font-weight: 600;">${order.status}</span>
          </div>
          ${failedBlock}
        </li>
      `;
    });
    ordersHtml += '</ul>';
  }

  const modal = `
     <div id="userDetailsModal" onclick="if(event.target.id==='userDetailsModal') this.remove()" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 2000; padding: 1rem;">
      <div style="background: #ffffff; border-radius: 12px; padding: 2.5rem; max-width: 600px; width: 100%; max-height: 80vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
        <h2 style="color: #1f2937; margin-bottom: 1.5rem; font-size: 1.5rem;">User Details</h2>
        <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 1.5rem; border-radius: 10px; margin-bottom: 1.5rem;">
          <p style="margin-bottom: 0.75rem; color: #1f2937;"><strong style="color: #495057;">Username:</strong> ${user.username}</p>
          <p style="margin-bottom: 0.75rem; color: #1f2937;"><strong style="color: #495057;">Email:</strong> ${user.email}</p>
          <p style="margin-bottom: 0.75rem; color: #1f2937;"><strong style="color: #495057;">Credits:</strong> <span style="color: #10b981; font-weight: 700; font-size: 1.1rem;">${user.checks}</span></p>
          <p style="margin-bottom: 0.5rem; color: #1f2937;"><strong style="color: #495057;">Total Orders:</strong> ${totalOrdersCount}</p>
          <p style="margin-bottom: 0.25rem; color: #1f2937;"><strong style="color: #495057;">Completed:</strong> <span style="color: #10b981; font-weight: 600;">${completedOrdersCount}</span></p>
          <p style="margin-bottom: 0.25rem; color: #1f2937;"><strong style="color: #495057;">Failed:</strong> <span style="color: #ef4444; font-weight: 600;">${failedOrdersCount}</span></p>
          <p style="margin-bottom: 0; color: #1f2937;"><strong style="color: #495057;">Pending:</strong> <span style="color: #f59e0b; font-weight: 600;">${pendingOrdersCount}</span></p>
        </div>
        
        <h3 style="margin-top: 1.5rem; margin-bottom: 1rem; color: #1f2937; font-size: 1.2rem;">Order History:</h3>
        ${ordersHtml}
        
        <div style="border-top: 2px solid #e5e7eb; margin-top: 2rem; padding-top: 1.5rem;">
          <h3 style="margin-bottom: 1rem; color: #1f2937; font-size: 1.1rem;">🔐 Change User Password</h3>
          <div class="form-group" style="margin-bottom: 1rem;">
            <label for="newPassword1_${user._id}" style="color: #1f2937; font-weight: 700; display: block; margin-bottom: 0.5rem;">New Password (visible):</label>
            <input type="text" id="newPassword1_${user._id}" placeholder="Enter new password (min 6 characters)" style="width: 100%; padding: 0.85rem 0.95rem; border: 2px solid #3b82f6; background: #ffffff; border-radius: 8px; font-size: 1rem; color: #111827; outline: none; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);">
          </div>
          <div class="form-group" style="margin-bottom: 1rem;">
            <label for="newPassword2_${user._id}" style="color: #1f2937; font-weight: 700; display: block; margin-bottom: 0.5rem;">Confirm New Password (visible):</label>
            <input type="text" id="newPassword2_${user._id}" placeholder="Confirm new password" style="width: 100%; padding: 0.85rem 0.95rem; border: 2px solid #ec4899; background: #ffffff; border-radius: 8px; font-size: 1rem; color: #111827; outline: none; box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.15);">
          </div>
          <button onclick="changeUserPassword('${user._id}')" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; font-weight: 600; width: 100%; margin-bottom: 1rem;">Change Password</button>
        </div>
        
        <button class="btn-secondary" onclick="document.getElementById('userDetailsModal').remove()" style="margin-top: 1rem; width: 100%; background: linear-gradient(135deg, #6c757d 0%, #495057 100%); color: white; border: none; padding: 0.75rem; border-radius: 8px; cursor: pointer; font-weight: 600;">Close</button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modal);
}

async function changeUserPassword(userId) {
  const password1 = document.getElementById('newPassword1_' + userId).value.trim();
  const password2 = document.getElementById('newPassword2_' + userId).value.trim();
  
  if (!password1 || !password2) {
    alert('Please enter password in both fields');
    showMessage('Please enter password in both fields', 'error');
    return;
  }
  
  if (password1 !== password2) {
    alert('Passwords do not match');
    showMessage('Passwords do not match', 'error');
    return;
  }
  
  if (password1.length < 6) {
    alert('Password must be at least 6 characters');
    showMessage('Password must be at least 6 characters', 'error');
    return;
  }
  
  try {
    const response = await fetch(`/api/admin/users/${userId}/password`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ newPassword: password1 })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      alert('Password changed successfully');
      showMessage('Password changed successfully', 'success');
      document.getElementById('newPassword1_' + userId).value = '';
      document.getElementById('newPassword2_' + userId).value = '';
    } else {
      alert(data.message || 'Error changing password');
      showMessage(data.message || 'Error changing password', 'error');
    }
  } catch (error) {
    console.error('Password change error:', error);
    alert('Error changing password: ' + error.message);
    showMessage('Error changing password: ' + error.message, 'error');
  }
}

function openFileUploadModal(orderId) {
  const modal = `
    <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 2000;">
      <div style="background: white; border-radius: 10px; padding: 2rem; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto;">
        <h2>Upload Report Files for Order</h2>
        <p style="color: #666; margin-bottom: 1.5rem;">Upload AI Report and/or Similarity Report files (at least one required)</p>
        
        <div class="form-group">
          <label for="aiReportFile" style="font-weight: 600; color: #333;">📊 AI Report File:</label>
          <input type="file" id="aiReportFile" accept=".pdf,.doc,.docx,.txt,.xlsx,.csv">
          <small style="color: #999;">Optional: AI analysis report for this submission</small>
        </div>

        <div class="form-group">
          <label for="similarityReportFile" style="font-weight: 600; color: #333;">🔍 Similarity Report File:</label>
          <input type="file" id="similarityReportFile" accept=".pdf,.doc,.docx,.txt,.xlsx,.csv">
          <small style="color: #999;">Optional: Plagiarism/similarity check report</small>
        </div>

        <div id="adminUploadProgress" style="display: none; margin-bottom: 1rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
            <span style="font-size: 0.9rem; font-weight: bold;">Uploading...</span>
            <span id="adminUploadProgressText" style="font-size: 0.9rem;">0%</span>
          </div>
          <progress id="adminUploadProgressBar" value="0" max="100" style="width: 100%; height: 8px; border-radius: 4px;"></progress>
        </div>
        
        <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem;">
          <button class="btn-secondary" id="adminCancelBtn" onclick="this.closest('div').parentElement.remove()">Cancel</button>
          <button class="btn-success" id="adminUploadBtn" onclick="uploadOrderFiles('${orderId}', event)">Upload Reports</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modal);
}

async function uploadOrderFiles(orderId, event) {
  const aiReportInput = event.target.parentElement.parentElement.querySelector('#aiReportFile');
  const similarityReportInput = event.target.parentElement.parentElement.querySelector('#similarityReportFile');
  const uploadBtn = event.target.parentElement.querySelector('#adminUploadBtn');
  const cancelBtn = event.target.parentElement.querySelector('#adminCancelBtn');
  const progressDiv = event.target.parentElement.parentElement.querySelector('#adminUploadProgress');
  const progressBar = event.target.parentElement.parentElement.querySelector('#adminUploadProgressBar');
  const progressText = event.target.parentElement.parentElement.querySelector('#adminUploadProgressText');
  
  // Check if at least one file is selected
  if (!aiReportInput.files.length && !similarityReportInput.files.length) {
    showMessage('Please select at least one report file', 'error');
    return;
  }

  // Disable buttons during upload
  uploadBtn.disabled = true;
  cancelBtn.disabled = true;
  progressDiv.style.display = 'block';
  progressBar.value = 0;
  progressText.textContent = '0%';

  const formData = new FormData();
  
  if (aiReportInput.files.length > 0) {
    formData.append('aiReport', aiReportInput.files[0]);
  }
  
  if (similarityReportInput.files.length > 0) {
    formData.append('similarityReport', similarityReportInput.files[0]);
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

    const response = await fetch(`/api/admin/orders/${orderId}/upload`, {
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
        event.target.closest('div').parentElement.remove();
        loadAllOrders();
      }, 500);
    } else {
      showMessage(data.message, 'error');
      progressDiv.style.display = 'none';
      uploadBtn.disabled = false;
      cancelBtn.disabled = false;
    }
  } catch (error) {
    showMessage('Error uploading files: ' + error.message, 'error');
    progressDiv.style.display = 'none';
    uploadBtn.disabled = false;
    cancelBtn.disabled = false;
  }
}

async function markComplete(orderId) {
  try {
    const response = await fetch(`/api/admin/orders/${orderId}/complete`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();

    if (response.ok) {
      showMessage(data.message, 'success');
      loadAllOrders();
    } else {
      showMessage(data.message, 'error');
    }
  } catch (error) {
    showMessage('Error completing order: ' + error.message, 'error');
  }
}

async function loadCodes() {
  try {
    const response = await fetch('/api/admin/codes', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const codes = await response.json();
    displayCodes(codes);
  } catch (error) {
    showMessage('Error loading codes', 'error');
  }
}

function displayCodes(codes) {
  const container = document.getElementById('codesContainer');
  if (!container) return;

  if (!codes.length) {
    container.innerHTML = '<div class="empty-state"><h2>No codes yet</h2></div>';
    return;
  }

  let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; margin-top: 1.5rem;">';

  codes.forEach(code => {
    const createdDateTime = new Date(code.createdAt);
    const created = createdDateTime.toLocaleDateString();
    const createdTime = createdDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const usedAtDateTime = code.usedAt ? new Date(code.usedAt) : null;
    const usedAt = usedAtDateTime ? usedAtDateTime.toLocaleDateString() : '—';
    const usedAtTime = usedAtDateTime ? usedAtDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
    
    const status = code.isUsed ? 'Used' : 'Available';
    const statusColor = code.isUsed ? '#ef4444' : '#10b981';
    const statusBgColor = code.isUsed ? '#fee2e2' : '#dcfce7';
    const usedBy = code.usedBy ? (code.usedBy.email || code.usedBy.username || 'User') : '—';

    html += `
      <div style="background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%); border: 2px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid #e2e8f0;">
          <div style="flex: 1;">
            <div style="font-size: 1.2rem; font-weight: 700; color: #1a202c; font-family: 'Courier New', monospace; letter-spacing: 2px;">${code.code}</div>
            <div style="color: #666; font-size: 0.85rem; margin-top: 0.25rem;">Redemption Code</div>
          </div>
          <div style="text-align: right;">
            <span style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 0.5rem 1rem; border-radius: 8px; font-weight: 700; font-size: 1rem;">${code.checks} 🏷️</span>
          </div>
        </div>
        
        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.25rem; padding: 0.75rem; background-color: ${statusBgColor}; border-radius: 8px;">
          <span style="font-weight: 600; color: ${statusColor};">${status}</span>
          <span style="color: ${statusColor}; font-weight: 600;">•</span>
          <span style="color: ${statusColor}; font-size: 0.9rem;">${code.isUsed ? '✓ Redeemed' : '⏳ Waiting'}</span>
        </div>
        
          <button onclick="copyToClipboard('${code.code}', this)" style="width: 100%; padding: 0.7rem; background: linear-gradient(135deg, #6366f1 0%, #06b6d4 100%); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; margin-bottom: 1rem; transition: all 0.3s ease; font-size: 0.95rem;">
            📋 Copy Code
          </button>
        <div style="display: flex; flex-direction: column; gap: 0.6rem; font-size: 0.9rem; color: #555;">
          ${code.isUsed ? `
            <div>
              <span style="font-weight: 600; color: #1a202c;">👤 Used By:</span>
              <span>${usedBy}</span>
            </div>
            <div>
              <span style="font-weight: 600; color: #1a202c;">⏰ Used At:</span>
              <span>${usedAt} at ${usedAtTime}</span>
            </div>
          ` : ''}
          <div>
            <span style="font-weight: 600; color: #1a202c;">📅 Created:</span>
            <span>${created} at ${createdTime}</span>
          </div>
        </div>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

function copyToClipboard(code, button) {
  navigator.clipboard.writeText(code).then(() => {
    const originalText = button.innerHTML;
    button.innerHTML = '✓ Copied!';
    button.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    
    setTimeout(() => {
      button.innerHTML = originalText;
      button.style.background = 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)';
    }, 2000);
  }).catch(() => {
    showMessage('Failed to copy code', 'error');
  });
}

async function createRedemptionCode(event) {
  event.preventDefault();

  const checksInput = document.getElementById('checksAmountInput');
  const customCodeInput = document.getElementById('customCodeInput');

  const payload = {
    checks: checksInput.value,
    code: customCodeInput.value.trim() || undefined
  };

  try {
    const response = await fetch('/api/admin/codes', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok) {
      showMessage(`${data.message}: ${data.code.code} (${data.code.checks} checks)`, 'success');
      checksInput.value = '';
      customCodeInput.value = '';
      loadCodes();
    } else {
      showMessage(data.message || 'Could not create code', 'error');
    }
  } catch (error) {
    showMessage('Error creating code: ' + error.message, 'error');
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
  window.location.href = '/login.html';
}

// Service Status Functions
async function loadServiceStatus() {
  try {
    const response = await fetch('/api/service/status', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    
    if (response.ok) {
      updateStatusToggle(data.isOnline);
    }
  } catch (error) {
    console.error('Error loading service status:', error);
  }
}

function updateStatusToggle(isOnline) {
  const toggle = document.getElementById('statusToggle');
  const statusText = document.getElementById('currentStatusText');
  const preview = document.getElementById('statusPreview');
  
  if (toggle) {
    toggle.checked = isOnline;
  }
  
  if (statusText) {
    if (isOnline) {
      statusText.innerHTML = '<img src="https://cdn.discordapp.com/emojis/1437360640409866240.gif" alt="Online" style="width: 20px; height: 20px; vertical-align: middle; margin-right: 8px;">Services Online';
      statusText.style.color = '#10b981';
    } else {
      statusText.innerHTML = '<img src="https://cdn.discordapp.com/emojis/1043080375649447936.gif" alt="Offline" style="width: 20px; height: 20px; vertical-align: middle; margin-right: 8px;">Services Offline';
      statusText.style.color = '#ef4444';
    }
  }
  
  if (preview) {
    if (isOnline) {
      preview.innerHTML = '<img src="https://cdn.discordapp.com/emojis/1437360640409866240.gif" alt="Online" style="width: 24px; height: 24px; vertical-align: middle; margin-right: 8px;">All services are online.';
      preview.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.15) 100%)';
      preview.style.color = '#10b981';
      preview.style.border = '2px solid rgba(16, 185, 129, 0.3)';
    } else {
      preview.innerHTML = '<img src="https://cdn.discordapp.com/emojis/1043080375649447936.gif" alt="Offline" style="width: 24px; height: 24px; vertical-align: middle; margin-right: 8px;">We are currently offline. Please wait until we are back in a few hours.';
      preview.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.15) 100%)';
      preview.style.color = '#ef4444';
      preview.style.border = '2px solid rgba(239, 68, 68, 0.3)';
    }
  }
}

async function toggleServiceStatus(isOnline) {
  try {
    const response = await fetch('/api/service/status', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ isOnline })
    });

    const data = await response.json();
    
    if (response.ok) {
      showMessage(data.message, 'success');
      updateStatusToggle(isOnline);
    } else {
      showMessage(data.message || 'Could not update status', 'error');
      // Revert toggle on error
      const toggle = document.getElementById('statusToggle');
      if (toggle) toggle.checked = !isOnline;
    }
  } catch (error) {
    showMessage('Error updating status: ' + error.message, 'error');
    // Revert toggle on error
    const toggle = document.getElementById('statusToggle');
    if (toggle) toggle.checked = !isOnline;
  }
}

// Setup status toggle listener
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('statusToggle');
  if (toggle) {
    toggle.addEventListener('change', (e) => {
      toggleServiceStatus(e.target.checked);
    });
  }
});

// Unlimited Users Management
async function loadUnlimitedUsers() {
  try {
    const response = await fetch('/api/unlimited/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const users = await response.json();
    
    if (!Array.isArray(users)) {
      throw new Error('Invalid response format from server');
    }
    
    allUnlimitedUsers = users;
    displayUnlimitedUsers(users);
    
    // Add search listener
    const unlimitedSearchInput = document.getElementById('unlimitedSearchInput');
    if (unlimitedSearchInput) {
      unlimitedSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        filterAndDisplayUnlimitedUsers(query);
      });
    }
  } catch (error) {
    showMessage('Error loading unlimited users: ' + error.message, 'error');
    const container = document.getElementById('unlimitedUsersContainer');
    if (container) {
      container.innerHTML = `<p style="text-align: center; color: #ef4444; padding: 2rem;">Error: ${error.message}</p>`;
    }
  }
}

function displayUnlimitedUsers(users) {
  const container = document.getElementById('unlimitedUsersContainer');
  container.innerHTML = '';

  if (!Array.isArray(users)) {
    container.innerHTML = '<p style="text-align: center; color: #ef4444; padding: 2rem;">Error: Invalid data format received from server</p>';
    return;
  }

  // Always show the convert form first
  const convertBtn = document.createElement('div');
  convertBtn.style.cssText = 'margin-bottom: 2rem; padding-bottom: 2rem; border-bottom: 1px solid #444;';
  convertBtn.innerHTML = `
    <h3 style="margin-bottom: 1rem;">Convert User to Unlimited</h3>
    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr auto; gap: 1rem; margin-bottom: 1.5rem; grid-auto-flow: dense;">
      <div style="position: relative; grid-column: span 1;">
        <input type="text" id="searchUserInput" placeholder="🔍 Search user by name/email" style="width: 100%; padding: 0.75rem; border-radius: 4px; background: #1a1a2e; color: white; border: 1px solid #444; font-size: 0.9rem;">
        <div id="userSearchDropdown" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: #1a1a2e; border: 1px solid #444; border-radius: 4px; max-height: 200px; overflow-y: auto; z-index: 1000;"></div>
      </div>
      <input type="number" id="dailyCredits" placeholder="Daily Credits" min="1" style="width: 100%; padding: 0.75rem; border-radius: 4px; background: #1a1a2e; color: white; border: 1px solid #444; font-size: 0.9rem;">
      <input type="number" id="subDays" placeholder="Subscription Days" min="1" style="width: 100%; padding: 0.75rem; border-radius: 4px; background: #1a1a2e; color: white; border: 1px solid #444; font-size: 0.9rem;">
      <button onclick="makeUserUnlimited()" style="background: #10b981; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 0.9rem; white-space: nowrap;">Make Unlimited</button>
    </div>
    <div id="selectedUserInfo" style="padding: 0.75rem; background: #0f172a; border: 1px solid #444; border-radius: 4px; display: none; margin-bottom: 1rem; color: #06b6d4; font-size: 0.9rem;"></div>
  `;
  convertBtn.appendChild(document.createElement('style')).textContent = `
    @media (max-width: 1200px) {
      #convertBtn_form { grid-template-columns: 1fr 1fr 1fr !important; }
    }
    @media (max-width: 768px) {
      #convertBtn_form { 
        grid-template-columns: 1fr !important;
        gap: 0.75rem !important;
      }
      #convertBtn_form button { width: 100%; }
    }
  `;
  
  const formDiv = convertBtn.querySelector('div');
  if (formDiv) formDiv.id = 'convertBtn_form';
  
  container.appendChild(convertBtn);
  
  // Populate user dropdown with all non-unlimited users
  loadAllUsersForUnlimited();

  // Show unlimited users list if any exist
  if (!users || users.length === 0) {
    container.innerHTML += '<p style="text-align: center; color: #999; padding: 2rem;">No unlimited users yet.</p>';
    return;
  }

  const table = document.createElement('table');
  table.style.cssText = 'width: 100%; border-collapse: collapse; margin-top: 2rem;';
  table.id = 'unlimitedUsersTable';
  
  table.innerHTML = `
    <thead>
      <tr style="background: #333; color: white;">
        <th style="padding: 1rem; text-align: left;">Username</th>
        <th style="padding: 1rem; text-align: left;">Email</th>
        <th style="padding: 1rem; text-align: left;">Daily Credits</th>
        <th style="padding: 1rem; text-align: left;">Days Remaining</th>
        <th style="padding: 1rem; text-align: left;">Next Reset</th>
        <th style="padding: 1rem; text-align: left;">Actions</th>
      </tr>
    </thead>
    <tbody>
      ${users.map(user => {
        const resetDate = new Date(user.unlimitedSettings.creditsResetAt);
        const resetDateStr = resetDate.toLocaleString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit',
          timeZoneName: 'short'
        });
        return `
          <tr style="border-bottom: 1px solid #444;">
            <td style="padding: 1rem;">${user.username}</td>
            <td style="padding: 1rem;">${user.email}</td>
            <td style="padding: 1rem; color: #10b981; font-weight: bold;">${user.unlimitedSettings.dailyCredits}</td>
            <td style="padding: 1rem; color: ${user.unlimitedSettings.subscriptionDaysRemaining <= 5 ? '#ef4444' : '#06b6d4'}; font-weight: bold;">${user.unlimitedSettings.subscriptionDaysRemaining} days</td>
            <td style="padding: 1rem; font-size: 0.9rem;">${resetDateStr}</td>
            <td style="padding: 1rem;">
              <button onclick="viewUnlimitedUserDetails('${user._id}')" style="background: #6366f1; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; font-size: 0.85rem;">View</button>
            </td>
          </tr>
        `;
      }).join('')}
    </tbody>
  `;

  // Add mobile-friendly styles
  const mobileStyle = document.createElement('style');
  mobileStyle.textContent = `
    @media (max-width: 768px) {
      #unlimitedUsersTable {
        display: block;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }
      #unlimitedUsersTable thead {
        display: none;
      }
      #unlimitedUsersTable tbody {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1rem;
      }
      #unlimitedUsersTable tr {
        display: flex;
        flex-direction: column;
        border: 1px solid #444 !important;
        border-radius: 8px;
        padding: 1rem;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      }
      #unlimitedUsersTable td {
        padding: 0.5rem 0 !important;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      #unlimitedUsersTable td:before {
        content: attr(data-label);
        font-weight: 600;
        color: #999;
        font-size: 0.85rem;
      }
      #unlimitedUsersTable button {
        width: 100%;
        margin-top: 0.5rem;
      }
    }
    @media (max-width: 480px) {
      #unlimitedUsersTable tbody {
        grid-template-columns: 1fr;
      }
    }
  `;
  document.head.appendChild(mobileStyle);

  container.appendChild(table);
}

async function loadAllUsersForUnlimited() {
  try {
    const response = await fetch('/api/admin/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const users = await response.json();
    const nonUnlimitedUsers = users.filter(u => !u.isUnlimited);
    
    // Store users globally for search
    window.allNonUnlimitedUsers = nonUnlimitedUsers;
    window.selectedUserId = null;
    
    // Set up search input
    const searchInput = document.getElementById('searchUserInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        filterUserSearchResults(query, nonUnlimitedUsers);
      });
    }
  } catch (error) {
    console.error('Error loading users:', error);
  }
}

function filterUserSearchResults(query, users) {
  const dropdown = document.getElementById('userSearchDropdown');
  const selectedUserInfo = document.getElementById('selectedUserInfo');
  
  if (!query) {
    dropdown.style.display = 'none';
    return;
  }
  
  const filtered = users.filter(user => {
    const username = (user.username || '').toLowerCase();
    const email = (user.email || '').toLowerCase();
    return username.includes(query) || email.includes(query);
  });
  
  if (filtered.length === 0) {
    dropdown.innerHTML = '<div style="padding: 0.75rem; color: #999;">No users found</div>';
    dropdown.style.display = 'block';
    return;
  }
  
  dropdown.innerHTML = filtered.map(user => `
    <div onclick="selectUserForUnlimited('${user._id}', '${user.username}', '${user.email}')" 
         style="padding: 0.75rem 1rem; cursor: pointer; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center; transition: background 0.2s;">
      <div>
        <div style="color: white; font-weight: 600;">${user.username}</div>
        <div style="color: #999; font-size: 0.85rem;">${user.email}</div>
      </div>
      <span style="color: #10b981; font-weight: 600;">💳 ${user.checks}</span>
    </div>
  `).join('');
  
  dropdown.style.display = 'block';
}

function selectUserForUnlimited(userId, username, email) {
  window.selectedUserId = userId;
  const searchInput = document.getElementById('searchUserInput');
  const dropdown = document.getElementById('userSearchDropdown');
  const selectedUserInfo = document.getElementById('selectedUserInfo');
  
  searchInput.value = `${username} (${email})`;
  dropdown.style.display = 'none';
  
  selectedUserInfo.style.display = 'block';
  selectedUserInfo.innerHTML = `✓ Selected: <strong>${username}</strong> - ${email}`;
}


async function makeUserUnlimited() {
  const userId = window.selectedUserId;
  const dailyCredits = parseInt(document.getElementById('dailyCredits').value);
  const subscriptionDays = parseInt(document.getElementById('subDays').value);

  if (!userId || !dailyCredits || !subscriptionDays) {
    showMessage('Please select a user and fill in all fields', 'error');
    return;
  }

  try {
    const response = await fetch(`/api/unlimited/users/${userId}/make-unlimited`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ dailyCredits, subscriptionDays })
    });

    const data = await response.json();
    
    if (response.ok) {
      showMessage('User converted to unlimited successfully!', 'success');
      document.getElementById('searchUserInput').value = '';
      document.getElementById('dailyCredits').value = '';
      document.getElementById('subDays').value = '';
      document.getElementById('selectedUserInfo').style.display = 'none';
      window.selectedUserId = null;
      loadUnlimitedUsers();
    } else {
      showMessage(data.message || 'Error converting user', 'error');
    }
  } catch (error) {
    showMessage('Error: ' + error.message, 'error');
  }
}

async function viewUnlimitedUserDetails(userId) {
  try {
    const response = await fetch(`/api/unlimited/users/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();
    showUnlimitedUserDetailsModal(data);
  } catch (error) {
    showMessage('Error loading user details: ' + error.message, 'error');
  }
}

function showUnlimitedUserDetailsModal(data) {
  const { user, unlimited, todayOrders } = data;
  
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    padding: 1rem;
  `;

  const content = document.createElement('div');
  content.style.cssText = `
    background: #1a1a2e;
    color: white;
    border-radius: 12px;
    padding: 2rem;
    max-width: 900px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
  `;

  content.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
      <h2 style="margin: 0;">${user.username}</h2>
      <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background: #ef4444; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">Close</button>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem;">
      <div>
        <h3 style="margin-top: 0;">User Info</h3>
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>Regular Checks:</strong> ${user.checks}</p>
        <p><strong>Member Since:</strong> ${new Date(user.createdAt).toLocaleDateString()}</p>
      </div>
      <div>
        <h3 style="margin-top: 0;">Unlimited Status</h3>
        <p><strong>Daily Credits:</strong> <span style="color: #10b981; font-size: 1.2em; font-weight: bold;">${unlimited.dailyCredits}</span></p>
        <p><strong>Days Remaining:</strong> <span style="color: #06b6d4; font-weight: bold;">${unlimited.subscriptionDaysRemaining} days</span></p>
        <p><strong>Today's Usage:</strong> ${unlimited.dailyCreditsUsedToday} / ${unlimited.dailyCredits}</p>
        <p><strong>Available Today:</strong> <span style="color: #10b981;">${unlimited.dailyCreditsAvailable}</span></p>
        <p><strong>Next Reset:</strong> ${new Date(unlimited.creditsResetAt).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}</p>
      </div>
    </div>

    <div style="margin-bottom: 2rem;">
      <h3>Admin Notes</h3>
      <textarea id="adminNotes" style="width: 100%; padding: 1rem; background: #0f172a; color: white; border: 1px solid #444; border-radius: 4px; font-family: monospace; resize: vertical; min-height: 120px;">${user.adminPrivateNotes}</textarea>
      <button onclick="saveAdminNotes('${user._id}')" style="background: #6366f1; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 4px; cursor: pointer; margin-top: 0.5rem;">Save Notes</button>
    </div>

    <div style="margin-bottom: 2rem;">
      <h3>Update Subscription</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
        <div>
          <label style="display: block; margin-bottom: 0.5rem;">Daily Credits</label>
          <input type="number" id="newDailyCredits" value="${unlimited.dailyCredits}" min="1" style="width: 100%; padding: 0.75rem; border-radius: 4px; background: #0f172a; color: white; border: 1px solid #444;">
        </div>
        <div>
          <label style="display: block; margin-bottom: 0.5rem;">Days Remaining</label>
          <input type="number" id="newSubDays" value="${unlimited.subscriptionDaysRemaining}" min="1" style="width: 100%; padding: 0.75rem; border-radius: 4px; background: #0f172a; color: white; border: 1px solid #444;">
        </div>
        <div>
          <label style="display: block; margin-bottom: 0.5rem;">&nbsp;</label>
          <button onclick="updateUnlimitedSettings('${user._id}')" style="width: 100%; background: #10b981; color: white; border: none; padding: 0.75rem; border-radius: 4px; cursor: pointer; font-weight: 600;">Update</button>
        </div>
      </div>
    </div>

    <div style="margin-bottom: 2rem;">
      <h3>Today's Orders (GMT)</h3>
      ${todayOrders.length > 0 ? `
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #0f172a; border-bottom: 1px solid #444;">
              <th style="padding: 0.75rem; text-align: left;">Service</th>
              <th style="padding: 0.75rem; text-align: left;">Daily Credits</th>
              <th style="padding: 0.75rem; text-align: left;">Regular Checks</th>
              <th style="padding: 0.75rem; text-align: left;">Type</th>
              <th style="padding: 0.75rem; text-align: left;">Status</th>
              <th style="padding: 0.75rem; text-align: left;">Time</th>
            </tr>
          </thead>
          <tbody>
            ${todayOrders.map(order => `
              <tr style="border-bottom: 1px solid #333;">
                <td style="padding: 0.75rem;">${order.book}</td>
                <td style="padding: 0.75rem; color: ${order.dailyCreditsUsed > 0 ? '#10b981' : '#999'}; font-weight: bold;">${order.dailyCreditsUsed || 0}</td>
                <td style="padding: 0.75rem; color: ${order.regularChecksUsed > 0 ? '#06b6d4' : '#999'}; font-weight: bold;">${order.regularChecksUsed || 0}</td>
                <td style="padding: 0.75rem;">
                  <span style="background: ${order.paymentSource === 'daily' ? '#10b981' : order.paymentSource === 'regular' ? '#06b6d4' : '#f97316'}; padding: 0.25rem 0.75rem; border-radius: 3px; font-size: 0.75rem; color: white;">
                    ${order.paymentSource || 'mixed'}
                  </span>
                </td>
                <td style="padding: 0.75rem;">
                  <span style="background: ${order.status === 'completed' ? '#10b981' : order.status === 'failed' ? '#ef4444' : '#f97316'}; padding: 0.25rem 0.75rem; border-radius: 3px; font-size: 0.85rem;">
                    ${order.status}
                  </span>
                </td>
                <td style="padding: 0.75rem; font-size: 0.9rem;">${new Date(order.createdAt).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : '<p style="color: #999;">No orders today</p>'}
    </div>

    <div style="display: flex; gap: 1rem;">
      <button onclick="revertUnlimited('${user._id}')" style="background: #ef4444; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 4px; cursor: pointer; font-weight: 600;">Revert to Normal User</button>
    </div>
  `;

  modal.appendChild(content);
  document.body.appendChild(modal);
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
}

async function saveAdminNotes(userId) {
  const notes = document.getElementById('adminNotes').value;
  
  try {
    const response = await fetch(`/api/unlimited/users/${userId}/notes`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ notes })
    });

    const data = await response.json();
    if (response.ok) {
      showMessage('Notes saved successfully', 'success');
    } else {
      showMessage(data.message || 'Error saving notes', 'error');
    }
  } catch (error) {
    showMessage('Error: ' + error.message, 'error');
  }
}

async function updateUnlimitedSettings(userId) {
  const dailyCredits = parseInt(document.getElementById('newDailyCredits').value);
  const subscriptionDays = parseInt(document.getElementById('newSubDays').value);

  if (!dailyCredits || !subscriptionDays) {
    showMessage('Please fill in all fields', 'error');
    return;
  }

  try {
    const response = await fetch(`/api/unlimited/users/${userId}/unlimited`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ dailyCredits, subscriptionDays })
    });

    const data = await response.json();
    if (response.ok) {
      showMessage('Settings updated successfully', 'success');
      setTimeout(() => viewUnlimitedUserDetails(userId), 1000);
    } else {
      showMessage(data.message || 'Error updating settings', 'error');
    }
  } catch (error) {
    showMessage('Error: ' + error.message, 'error');
  }
}

async function revertUnlimited(userId) {
  if (!confirm('Are you sure you want to revert this user to normal status?')) return;

  try {
    const response = await fetch(`/api/unlimited/users/${userId}/revert-unlimited`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    if (response.ok) {
      showMessage('User reverted to normal status', 'success');
      document.querySelector('[style*="position: fixed"]')?.remove();
      loadUnlimitedUsers();
    } else {
      showMessage(data.message || 'Error reverting user', 'error');
    }
  } catch (error) {
    showMessage('Error: ' + error.message, 'error');
  }
}

// Filter and display unlimited users based on search query
function filterAndDisplayUnlimitedUsers(query) {
  if (!query) {
    displayUnlimitedUsers(allUnlimitedUsers);
    return;
  }
  
  const filtered = allUnlimitedUsers.filter(user => {
    const username = (user.username || '').toLowerCase();
    const email = (user.email || '').toLowerCase();
    return username.includes(query) || email.includes(query);
  });
  
  displayUnlimitedUsers(filtered);
}

// ========== PACKAGE MANAGEMENT ==========
async function loadPackagesAdmin() {
  try {
    const response = await fetch('/api/packages/all', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    if (response.ok) {
      displayPackagesAdmin(data);
    } else {
      showMessage(data.message || 'Could not load packages', 'error');
    }
  } catch (error) {
    showMessage('Error loading packages: ' + error.message, 'error');
  }
}

function displayPackagesAdmin(packages) {
  const container = document.getElementById('packagesContainer');
  if (!container) return;

  if (!packages || packages.length === 0) {
    container.innerHTML = '<div style="background: white; padding: 2rem; border-radius: 12px; text-align: center; color: #666;">No packages found. Add your first package below.</div>';
    return;
  }

  let html = '<div style="display: grid; gap: 1.5rem;">';

  packages.forEach(pkg => {
    html += `
      <div style="background: white; border: 2px solid ${pkg.isActive ? '#10b981' : '#e5e7eb'}; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 200px;">
            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
              <span style="font-size: 1.5rem;">${pkg.isUnlimited ? '♾️' : '💎'}</span>
              <div>
                <input type="text" id="label-${pkg.id}" value="${pkg.label}" 
                  style="font-size: 1.1rem; font-weight: 700; border: 1px solid #e5e7eb; border-radius: 6px; padding: 0.5rem; width: 100%; max-width: 300px;" 
                  placeholder="Package Label">
                <p style="margin: 0.3rem 0 0 0; color: #666; font-size: 0.85rem;">ID: ${pkg.id}</p>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; margin-top: 1rem;">
              <div>
                <label style="display: block; margin-bottom: 0.3rem; color: #666; font-size: 0.9rem; font-weight: 600;">Credits</label>
                <input type="number" id="checks-${pkg.id}" value="${pkg.checks}" min="1" 
                  style="width: 100%; border: 1px solid #e5e7eb; border-radius: 6px; padding: 0.6rem; font-size: 0.95rem;">
              </div>
              <div>
                <label style="display: block; margin-bottom: 0.3rem; color: #666; font-size: 0.9rem; font-weight: 600;">Price (USD)</label>
                <input type="number" id="price-${pkg.id}" value="${pkg.priceUsd}" min="0" step="0.01" 
                  style="width: 100%; border: 1px solid #e5e7eb; border-radius: 6px; padding: 0.6rem; font-size: 0.95rem;">
              </div>
            </div>
            <div style="margin-top: 1rem; display: flex; align-items: center; gap: 0.5rem;">
              <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                <input type="checkbox" id="unlimited-${pkg.id}" ${pkg.isUnlimited ? 'checked' : ''} 
                  style="width: 18px; height: 18px; cursor: pointer; accent-color: #6366f1;">
                <span style="color: #666; font-size: 0.9rem;">Unlimited Package</span>
              </label>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            <button onclick="updatePackage('${pkg.id}')" class="btn-primary" style="white-space: nowrap; padding: 0.6rem 1.2rem;">
              💾 Save Changes
            </button>
            <button onclick="togglePackageStatus('${pkg.id}', ${!pkg.isActive})" 
              class="btn-secondary" style="white-space: nowrap; padding: 0.6rem 1.2rem; background: ${pkg.isActive ? '#ef4444' : '#10b981'}; color: white;">
              ${pkg.isActive ? '❌ Deactivate' : '✅ Activate'}
            </button>
          </div>
        </div>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

async function updatePackage(pkgId) {
  const label = document.getElementById(`label-${pkgId}`)?.value.trim();
  const checks = document.getElementById(`checks-${pkgId}`)?.value;
  const priceUsd = document.getElementById(`price-${pkgId}`)?.value;
  const isUnlimited = document.getElementById(`unlimited-${pkgId}`)?.checked;

  if (!label || !checks || priceUsd === undefined) {
    showMessage('Please fill in all fields', 'error');
    return;
  }

  try {
    const response = await fetch(`/api/packages/${pkgId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        label,
        checks: Number(checks),
        priceUsd: Number(priceUsd),
        isUnlimited
      })
    });

    const data = await response.json();
    if (response.ok) {
      showMessage('Package updated successfully!', 'success');
      loadPackagesAdmin();
    } else {
      showMessage(data.message || 'Could not update package', 'error');
    }
  } catch (error) {
    showMessage('Error updating package: ' + error.message, 'error');
  }
}

async function togglePackageStatus(pkgId, activate) {
  try {
    const response = await fetch(`/api/packages/${pkgId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ isActive: activate })
    });

    const data = await response.json();
    if (response.ok) {
      showMessage(`Package ${activate ? 'activated' : 'deactivated'} successfully!`, 'success');
      loadPackagesAdmin();
    } else {
      showMessage(data.message || 'Could not update status', 'error');
    }
  } catch (error) {
    showMessage('Error updating status: ' + error.message, 'error');
  }
}


