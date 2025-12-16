let token = localStorage.getItem('token');
let currentUser = localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser')) : null;
let books = [];
const DISCORD_INVITE_URL = 'https://discord.gg/7WbyvTWKk'; // TODO: Replace with your actual invite link

// Check if user is logged in
if (!token) {
  window.location.href = 'login.html';
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  displayUserInfo();
  loadBooks();
  setupTabButtons();
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
  } catch (error) {
    console.error('Error fetching checks:', error);
  }
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
  cardTurnitin.className = 'card';
  const turnitinAvailable = !!turnitin;
  cardTurnitin.innerHTML = `
    <h3>TurnItIn Check</h3>
    <p>Get a plagiarism similarity report. File upload required.</p>
    <div class="card-footer">
      <span class="price-badge">1 Credit</span>
      ${turnitinAvailable
        ? `<button onclick="openBuyModal('${turnitin._id}', 'TurnItIn Check', 1)">Order Now</button>`
        : `<button disabled>Unavailable</button>`}
    </div>
  `;
  container.appendChild(cardTurnitin);

  // Assignment Help (Discord)
  const cardAssignment = document.createElement('div');
  cardAssignment.className = 'card';
  cardAssignment.innerHTML = `
    <h3>Assignment Help</h3>
    <p>Get personalized assistance for your assignment on Discord.</p>
    <div class="card-footer">
      <span class="price-badge">Join Discord</span>
      <a class="btn-secondary" href="${DISCORD_INVITE_URL}" target="_blank" rel="noopener">Open Discord</a>
    </div>
  `;
  container.appendChild(cardAssignment);

  // Rewrite (Discord)
  const cardRewrite = document.createElement('div');
  cardRewrite.className = 'card';
  cardRewrite.innerHTML = `
    <h3>Rewrite</h3>
    <p>Request a rewrite or polishing via Discord.</p>
    <div class="card-footer">
      <span class="price-badge">Join Discord</span>
      <a class="btn-secondary" href="${DISCORD_INVITE_URL}" target="_blank" rel="noopener">Open Discord</a>
    </div>
  `;
  container.appendChild(cardRewrite);
}

function openBuyModal(bookId, bookTitle, price) {
  if (currentUser.checks < price) {
    showMessage('Insufficient credits for this purchase', 'error');
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

  let html = `
    <table>
      <thead>
        <tr>
          <th>Order ID</th>
          <th>Service</th>
          <th>Price</th>
          <th>Status</th>
          <th>User File</th>
          <th>Admin File</th>
          <th>Date</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
  `;

  orders.forEach(order => {
    const statusClass = order.status === 'completed' ? 'status-completed' : 'status-pending';
    const date = new Date(order.createdAt).toLocaleDateString();
    const userFileUrl = order.userFile && (order.userFile.url || order.userFile.secure_url || order.userFile.path);
    const adminFileUrl = order.adminFile && (order.adminFile.url || order.adminFile.secure_url || order.adminFile.path);
    const userFileLink = userFileUrl
      ? `<a href="${userFileUrl}" target="_blank" rel="noopener" download>Download</a>`
      : '—';
    const adminFileLink = adminFileUrl
      ? `<a href="${adminFileUrl}" target="_blank" rel="noopener" download>Download</a>`
      : 'Pending';

    html += `
      <tr>
        <td><code style="background: #f0f0f0; padding: 0.3rem 0.6rem; border-radius: 3px; font-size: 0.85rem;">${order._id}</code></td>
        <td>${order.book.title}</td>
        <td>${order.checksUsed} Credits</td>
        <td><span class="status-badge ${statusClass}">${order.status}</span></td>
        <td>${userFileLink}</td>
        <td>${adminFileLink}</td>
        <td>${date}</td>
        <td>
          <button class="btn-secondary" onclick="viewOrderDetails('${order._id}')">View</button>
        </td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
}

function viewOrderDetails(orderId) {
  // Can be extended to show more details
  alert('Order ID: ' + orderId);
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
