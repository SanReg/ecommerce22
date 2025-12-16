let token = localStorage.getItem('token');
let currentUser = localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser')) : null;

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
    displayAllOrders(data);
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

  let html = `
    <table>
      <thead>
        <tr>
          <th>Order ID</th>
          <th>User</th>
          <th>Service</th>
          <th>Credits Used</th>
          <th>Status</th>
          <th>Files</th>
          <th>Date</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
  `;

  orders.forEach(order => {
    const statusClass = order.status === 'completed' ? 'status-completed' : 'status-pending';
    const date = new Date(order.createdAt).toLocaleDateString();
    const userFileStatus = order.userFile ? '✓' : '✗';
    const adminFileStatus = order.adminFile ? '✓' : '✗';
    const userName = order.user && (order.user.username || order.user.email) ? (order.user.username || order.user.email) : 'Unknown User';
    const bookTitle = order.book && order.book.title ? order.book.title : 'Unknown Service';

    html += `
      <tr>
        <td><code style="background: #f0f0f0; padding: 0.3rem 0.6rem; border-radius: 3px; font-size: 0.85rem;">${order._id}</code></td>
        <td>${userName}</td>
        <td>${bookTitle}</td>
        <td>${order.checksUsed}</td>
        <td><span class="status-badge ${statusClass}">${order.status}</span></td>
        <td>User: ${userFileStatus}, Admin: ${adminFileStatus}</td>
        <td>${date}</td>
        <td>
          ${order.status === 'pending' ? `<button class="btn-success" onclick="markComplete('${order._id}')">Complete</button>` : ''}
          <button class="btn-secondary" onclick="openFileUploadModal('${order._id}')">Upload File</button>
          ${order.userFile && (order.userFile.url || order.userFile.secure_url || order.userFile.path) ? `<a href="${order.userFile.url || order.userFile.secure_url || order.userFile.path}" target="_blank" class="btn-secondary" download>View User File</a>` : ''}
          ${order.adminFile && (order.adminFile.url || order.adminFile.secure_url || order.adminFile.path) ? `<a href="${order.adminFile.url || order.adminFile.secure_url || order.adminFile.path}" target="_blank" class="btn-secondary" download>View Admin File</a>` : ''}
        </td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
}

async function loadAllUsers() {
  try {
    const response = await fetch('/api/admin/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const users = await response.json();
    displayAllUsers(users);
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

  let html = `
    <table>
      <thead>
        <tr>
          <th>Username</th>
          <th>Email</th>
            <th>Credits</th>
          <th>Joined</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
  `;

  users.forEach(user => {
    const date = new Date(user.createdAt).toLocaleDateString();
    html += `
      <tr>
        <td>${user.username}</td>
        <td>${user.email}</td>
        <td><strong style="color: #2ecc71;">${user.checks}</strong></td>
        <td>${date}</td>
        <td>
          <button class="btn-secondary" onclick="viewUserDetails('${user._id}')">View Orders</button>
        </td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
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
  
  let ordersHtml = '';
  if (orders.length === 0) {
    ordersHtml = '<p style="color: #999;">No orders</p>';
  } else {
    ordersHtml = '<ul style="list-style: none;">';
    orders.forEach(order => {
      ordersHtml += `
        <li style="margin-bottom: 0.5rem; padding: 0.5rem; background: #f8f9fa; border-radius: 3px;">
            ${order.book.title} - ${order.checksUsed} Credits (${order.status})
        </li>
      `;
    });
    ordersHtml += '</ul>';
  }

  const modal = `
    <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 2000;">
      <div style="background: white; border-radius: 10px; padding: 2rem; max-width: 600px; width: 100%; max-height: 80vh; overflow-y: auto;">
        <h2>${user.username}</h2>
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>Credits:</strong> <span style="color: #2ecc71; font-weight: bold;">${user.checks}</span></p>
        <p><strong>Total Orders:</strong> ${totalOrdersCount}</p>
        <p><strong>Completed Orders:</strong> ${completedOrdersCount}</p>
        
        <h3 style="margin-top: 1.5rem;">Orders:</h3>
        ${ordersHtml}
        
        <button class="btn-secondary" onclick="this.closest('div').parentElement.remove()" style="margin-top: 1.5rem; width: 100%;">Close</button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modal);
}

function openFileUploadModal(orderId) {
  const modal = `
    <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 2000;">
      <div style="background: white; border-radius: 10px; padding: 2rem; max-width: 500px; width: 100%;">
        <h2>Upload File for Order</h2>
        
        <div class="form-group">
          <label for="fileToUpload">Select File:</label>
          <input type="file" id="fileToUpload">
        </div>

        <div id="adminUploadProgress" style="display: none; margin-bottom: 1rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
            <span style="font-size: 0.9rem; font-weight: bold;">Uploading...</span>
            <span id="adminUploadProgressText" style="font-size: 0.9rem;">0%</span>
          </div>
          <progress id="adminUploadProgressBar" value="0" max="100" style="width: 100%; height: 8px; border-radius: 4px;"></progress>
        </div>
        
        <div style="display: flex; gap: 1rem; justify-content: flex-end;">
          <button class="btn-secondary" id="adminCancelBtn" onclick="this.closest('div').parentElement.remove()">Cancel</button>
          <button class="btn-success" id="adminUploadBtn" onclick="uploadOrderFile('${orderId}', event)">Upload</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modal);
}

async function uploadOrderFile(orderId, event) {
  const fileInput = event.target.parentElement.parentElement.querySelector('#fileToUpload');
  const uploadBtn = event.target.parentElement.querySelector('#adminUploadBtn');
  const cancelBtn = event.target.parentElement.querySelector('#adminCancelBtn');
  const progressDiv = event.target.parentElement.parentElement.querySelector('#adminUploadProgress');
  const progressBar = event.target.parentElement.parentElement.querySelector('#adminUploadProgressBar');
  const progressText = event.target.parentElement.parentElement.querySelector('#adminUploadProgressText');
  
  if (!fileInput.files.length) {
    showMessage('Please select a file', 'error');
    return;
  }

  // Disable buttons during upload
  uploadBtn.disabled = true;
  cancelBtn.disabled = true;
  progressDiv.style.display = 'block';
  progressBar.value = 0;
  progressText.textContent = '0%';

  const formData = new FormData();
  formData.append('file', fileInput.files[0]);

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
    showMessage('Error uploading file: ' + error.message, 'error');
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

  let html = `
    <table>
      <thead>
        <tr>
          <th>Code</th>
          <th>Checks</th>
          <th>Status</th>
          <th>Used By</th>
          <th>Created</th>
          <th>Used At</th>
        </tr>
      </thead>
      <tbody>
  `;

  codes.forEach(code => {
    const created = new Date(code.createdAt).toLocaleDateString();
    const usedAt = code.usedAt ? new Date(code.usedAt).toLocaleDateString() : '—';
    const status = code.isUsed ? 'Used' : 'Available';
    const statusClass = code.isUsed ? 'status-completed' : 'status-pending';
    const usedBy = code.usedBy ? (code.usedBy.email || code.usedBy.username || 'User') : '—';

    html += `
      <tr>
        <td>${code.code}</td>
        <td>${code.checks}</td>
        <td><span class="status-badge ${statusClass}">${status}</span></td>
        <td>${usedBy}</td>
        <td>${created}</td>
        <td>${usedAt}</td>
      </tr>
    `;
  });

  html += '</tbody></table>';
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
