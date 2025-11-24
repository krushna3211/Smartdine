// js/dashboard.js (UPDATED - All-in-One)

// --- AUTH GUARD (RUNS FIRST, BEFORE DOM) ---
const token = localStorage.getItem("token");
const role = localStorage.getItem("role");
const currentPath = window.location.pathname;

// 1. If no token, redirect to login
if (!token && !currentPath.endsWith('login.html') && !currentPath.endsWith('index.html')) {
  window.location.href = 'login.html';
}

// 2. If you have a token, check roles
if (token) {
  const isAdmin = (role === 'admin');
  
  // 3. Admin-only pages
  const adminPages = ['/dashboard.html', '/staff.html', '/inventory.html'];
  
  // 4. Staff-only pages
  const staffPages = ['/staff-dashboard.html'];

  // 5. If you are STAFF and on an ADMIN page, go to your dashboard
  if (!isAdmin && adminPages.some(page => currentPath.endsWith(page))) {
    window.location.href = 'staff-dashboard.html';
  }

  // 6. If you are ADMIN and on a STAFF page, go to your dashboard
  if (isAdmin && staffPages.some(page => currentPath.endsWith(page))) {
    window.location.href = 'dashboard.html';
  }
}
// --- END AUTH GUARD ---
// --- UI Notification Helpers ---

// 1. Success/Error Toast (Top Right Corner)
window.showToast = function(message, type = "success") {
  let backgroundColor;
  
  if (type === "success") {
    backgroundColor = "linear-gradient(to right, #e67e22, #f39c12)"; // Your Brand Orange
  } else {
    backgroundColor = "linear-gradient(to right, #e74c3c, #c0392b)"; // Red for Error
  }

  Toastify({
    text: message,
    duration: 3000, // 3 seconds
    close: true,
    gravity: "top", // `top` or `bottom`
    position: "right", // `left`, `center` or `right`
    style: {
      background: backgroundColor,
      borderRadius: "8px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
    },
  }).showToast();
};

// 2. Delete Confirmation Modal (Beautiful Center Alert)
window.confirmDelete = async function(itemName) {
  const result = await Swal.fire({
    title: 'Are you sure?',
    text: `You won't be able to revert deleting "${itemName}"!`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#e67e22', // Your Brand Orange
    cancelButtonColor: '#333',
    confirmButtonText: 'Yes, delete it!'
  });
  return result.isConfirmed;
};

document.addEventListener("DOMContentLoaded", () => {
  
  // --- Authentication & Shared UI ---
  const adminName = localStorage.getItem("adminName");
  
  // 1. Set User Name (works on all pages)
  document.querySelectorAll('#adminName').forEach(el => {
    if (adminName) el.textContent = adminName;
  });

  // 2. Logout Button (works on all pages)
  document.querySelectorAll('#logoutBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('adminName');
      localStorage.removeItem('role');
      showToast("Logged out successfully. See you soon!", "success");
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1000);
    });
  });

  // 3. Role-based element hiding
  if (role === 'staff') {
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = 'none';
    });
  } else if (role === 'admin') {
    document.querySelectorAll('.staff-only').forEach(el => {
      el.style.display = 'none';
    });
  }


  // --- Page-Specific Logic for dashboard.html (Admin) ---
  const staffCountEl = document.getElementById('staffCount'); 
  
  // Check if we are on the Admin Dashboard
  if (staffCountEl) {
    
    // Get all 6 card elements
    const menuCountEl = document.getElementById("menuCount");
    const orderCountEl = document.getElementById("orderCount");
    const inventoryCountEl = document.getElementById("inventoryCount");
    const availableTablesEl = document.getElementById("availableTables"); // New
    const pendingBillsEl = document.getElementById("pendingBills");     // New

    // 1. Load Staff Count
    async function loadStaffCount() {
      try {
        const res = await fetch("/api/staff", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (staffCountEl) staffCountEl.textContent = data.length;
      } catch (err) { if (staffCountEl) staffCountEl.textContent = "Err"; }
    }

    // 2. Load Menu Count
    async function loadMenuCount() {
      try {
        const res = await fetch("/api/menu", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (menuCountEl) menuCountEl.textContent = data.length;
      } catch (err) { if (menuCountEl) menuCountEl.textContent = "Err"; }
    }

    // 3. Load Order Count
    async function loadOrderCount() {
      try {
        const res = await fetch("/api/orders", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (orderCountEl) orderCountEl.textContent = data.length;
      } catch (err) { if (orderCountEl) orderCountEl.textContent = "Err"; }
    }
    
    // 4. Load Inventory Count
    async function loadInventoryCount() {
      try {
        const res = await fetch("/api/inventory", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (inventoryCountEl) inventoryCountEl.textContent = data.length;
      } catch (err) { if (inventoryCountEl) inventoryCountEl.textContent = "Err"; }
    }

    // 5. Load Available Tables Count (NEW)
    async function loadAvailableTables() {
      try {
        const res = await fetch("/api/tables", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const tables = await res.json();
        const available = tables.filter(t => t.status === 'available');
        if (availableTablesEl) availableTablesEl.textContent = available.length;
      } catch (err) { if (availableTablesEl) availableTablesEl.textContent = "Err"; }
    }

    // 6. Load Pending Bills Count (NEW)
    async function loadPendingBills() {
      try {
        const res = await fetch("/api/orders", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const orders = await res.json();
        const pending = orders.filter(o => o.status === 'completed' || o.status === 'delivered');
        if (pendingBillsEl) pendingBillsEl.textContent = pending.length;
      } catch (err) { if (pendingBillsEl) pendingBillsEl.textContent = "Err"; }
    }

    // Run all 6 functions
    loadStaffCount();
    loadMenuCount();
    loadOrderCount();
    loadInventoryCount();
    loadAvailableTables();
    loadPendingBills();
  }
});