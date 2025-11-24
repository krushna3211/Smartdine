// js/staff-dashboard.js
document.addEventListener("DOMContentLoaded", () => {
  
  const token = localStorage.getItem("token");

  // Get the <p> tags from the cards
  const activeOrdersEl = document.getElementById("activeOrders");
  const availableTablesEl = document.getElementById("availableTables");
  const pendingBillsEl = document.getElementById("pendingBills");

  // --- 1. Load Active Orders Count ---
  async function loadActiveOrders() {
    try {
      const res = await fetch(" /api/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const orders = await res.json();
      
      // Filter for orders that are 'pending' or 'preparing'
      const active = orders.filter(o => o.status === 'pending' || o.status === 'preparing');
      
      if (activeOrdersEl) activeOrdersEl.textContent = active.length;

    } catch (err) {
      console.error("Error loading active orders", err);
      if (activeOrdersEl) activeOrdersEl.textContent = "Err";
    }
  }

  // --- 2. Load Available Tables Count ---
  async function loadAvailableTables() {
    try {
      const res = await fetch("/api/tables", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const tables = await res.json();
      
      // Filter for tables that are 'available'
      const available = tables.filter(t => t.status === 'available');
      
      if (availableTablesEl) availableTablesEl.textContent = available.length;

    } catch (err) {
      console.error("Error loading available tables", err);
      if (availableTablesEl) availableTablesEl.textContent = "Err";
    }
  }

  // --- 3. Load Pending Bills Count ---
  async function loadPendingBills() {
    try {
      const res = await fetch("/api/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const orders = await res.json();
      
      // Filter for orders ready for billing
      const pending = orders.filter(o => o.status === 'completed' || o.status === 'delivered');
      
      if (pendingBillsEl) pendingBillsEl.textContent = pending.length;

    } catch (err) {
      console.error("Error loading pending bills", err);
      if (pendingBillsEl) pendingBillsEl.textContent = "Err";
    }
  }

  // --- Run all functions ---
  // Check if we are on the staff dashboard by looking for one of its card IDs
  if (activeOrdersEl) {
    loadActiveOrders();
    loadAvailableTables();
    loadPendingBills();
  }
  
});