let token = localStorage.getItem('token');
let currentUser = localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser')) : null;
let allOrders = [];
let allUsers = [];

function refreshUsersView() {
  if (Array.isArray(allUsers) && allUsers.length > 0) {
    displayAllUsers(allUsers);
  }
}

// Check if user is admin
if (!token || !currentUser || !currentUser.isAdmin) {
  window.location.href = '/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  displayAdminInfo();
  setupTabButtons();
  loadAllOrders();
  loadAllUsers();
  loadCodes();

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
          <p style="margin: 0.4rem 0 0 0; font-size: 0.9rem; color: #1f2937;">💳 Credits Refunded: <strong>${order.refundAmount || order.checksUsed}</strong></p>
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
    displayAllUsers(allUsers);
    refreshUsersView();
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
