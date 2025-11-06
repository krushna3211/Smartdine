// js/tables.js
document.addEventListener("DOMContentLoaded", () => {
  
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  const tablesGrid = document.getElementById("tablesGrid");
  const addTableBtn = document.getElementById("addTableBtn");
  const tableModal = document.getElementById("tableModal");
  const cancelTableBtn = document.getElementById("cancelTableBtn");
  const tableForm = document.getElementById("tableForm");
  const tableModalTitle = document.getElementById("tableModalTitle");
  const tableNumber = document.getElementById("tableNumber");
  const tableStatus = document.getElementById("tableStatus");

  let tableEditMode = false;
  let editTableId = null;

  async function loadTables() {
    if (!tablesGrid) return; 

    const res = await fetch("http://localhost:5000/api/tables", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    tablesGrid.innerHTML = "";
    data.forEach((table) => {
      const card = document.createElement("div");
      card.classList.add("table-card", `status-${table.status}`);
      const displayStatus = table.status.charAt(0).toUpperCase() + table.status.slice(1);

      card.innerHTML = `
        <h3>Table ${table.number}</h3>
        <span class="table-status status-${table.status}">${displayStatus}</span>
        <div>
          <button onclick="changeStatus('${table._id}', '${table.status}')">🔁</button>
          <button class="admin-only" onclick="editTable('${table._id}', '${table.number}', '${table.status}')">✏️</button>
          <button class="admin-only" onclick="deleteTable('${table._id}')">🗑️</button>
        </div>
      `;
      tablesGrid.appendChild(card);
    });

    if (role === 'staff') {
      document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = 'none';
      });
    }
  }

  // --- Change status (Staff & Admin) ---
  // Attaching to 'window' makes it global
  window.changeStatus = async function (id, currentStatus) {
    const nextStatus =
      currentStatus === "available"
        ? "occupied"
        : currentStatus === "occupied"
        ? "reserved"
        : "available";

    // --- THIS IS THE CORRECT, STAFF-SAFE URL ---
    await fetch(`http://localhost:5000/api/tables/${id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: nextStatus }),
    });

    loadTables(); // Reload to show the new status
  }

  // --- Delete (Admin only) ---
  window.deleteTable = async function (id) {
    if (!confirm("Delete this table?")) return;
    await fetch(`http://localhost:5000/api/tables/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    loadTables();
  }

  // --- Edit Table (Admin only) ---
  window.editTable = function (id, number, status) {
    tableEditMode = true;
    editTableId = id;
    tableModalTitle.textContent = "Edit Table";
    tableNumber.value = number;
    tableStatus.value = status;
    openTableModal();
  }

  // --- Add/Edit Submit (Admin-only) ---
  if (tableForm) {
    tableForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const number = tableNumber.value;
      const status = tableStatus.value; 
      const method = tableEditMode ? "PUT" : "POST";
      
      // Admin uses the main PUT route
      const url = tableEditMode
        ? `http://localhost:5000/api/tables/${editTableId}`
        : "http://localhost:5000/api/tables";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ number, status }),
      });

      const data = await res.json();
      alert(data.message || "Table saved!");
      closeTableModal();
      loadTables();
    });
  }

  // --- Modal controls ---
  if (addTableBtn) {
    addTableBtn.addEventListener("click", () => {
      tableEditMode = false;
      if (tableForm) tableForm.reset();
      tableStatus.value = "available";
      if (tableModalTitle) tableModalTitle.textContent = "Add Table";
      openTableModal();
    });
  }

  if (cancelTableBtn) {
    cancelTableBtn.addEventListener("click", closeTableModal);
  }

  function openTableModal() {
    if (tableModal) tableModal.classList.remove("hidden");
  }
  function closeTableModal() {
    if (tableModal) tableModal.classList.add("hidden");
  }

  // --- Initial Load ---
  loadTables();

});