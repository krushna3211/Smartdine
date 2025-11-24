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

  // --- Load Tables (UPDATED with 'reserved' check) ---
  async function loadTables() {
    if (!tablesGrid) return; // Make sure element exists

    const res = await fetch(" /api/tables", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    tablesGrid.innerHTML = "";
    data.forEach((table) => {
      const card = document.createElement("div");
      card.classList.add("table-card", `status-${table.status}`);
      const displayStatus = table.status.charAt(0).toUpperCase() + table.status.slice(1);

      // --- THIS IS THE NEW LOGIC ---
      let changeStatusBtn = ''; // Start with no button

      // Show the button ONLY if:
      // 1. The user is an admin (admins can do anything)
      // OR
      // 2. The user is staff AND the table is NOT 'reserved'
      if (role === 'admin' || (role === 'staff' && table.status !== 'reserved')) {
        changeStatusBtn = `<button onclick="changeStatus('${table._id}', '${table.status}')">🔁</button>`;
      }
      // --- END NEW LOGIC ---

      card.innerHTML = `
        <h3>Table ${table.number}</h3>
        <span class="table-status status-${table.status}">${displayStatus}</span>
        <div>
          ${changeStatusBtn}
          <button class="admin-only" onclick="editTable('${table._id}', '${table.number}', '${table.status}')">✏️</button>
          <button class="admin-only" onclick="deleteTable('${table._id}')">🗑️</button>
        </div>
      `;

      tablesGrid.appendChild(card);
    });

    // This part is still needed to hide the admin buttons for staff
    if (role === 'staff') {
      document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = 'none';
      });
    }
  }
  // --- Change status (Staff & Admin) ---
  // Attaching to 'window' makes it global
  // --- Change status (Staff & Admin) ---
  window.changeStatus = async function (id, currentStatus) {
    const nextStatus =
      currentStatus === "available"
        ? "occupied"
        : currentStatus === "occupied"
        ? "reserved"
        : "available";

    try {
      const res = await fetch(`/api/tables/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (res.ok) {
        showToast(`Table status changed to ${nextStatus}`, "success");
        loadTables(); // Reload to show the new status
      } else {
        const data = await res.json();
        showToast(data.message || "Failed to change status", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Server error. Please try again.", "error");
    }
  }
  // --- Delete (Admin only) ---
 window.deleteTable = async function (id) {
    // Use SweetAlert
    if (await confirmDelete("this table")) {
      try {
        const res = await fetch(`/api/tables/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (res.ok) {
          showToast("Table deleted successfully", "success");
          loadTables();
        } else {
          showToast("Failed to delete table", "error");
        }
      } catch (err) {
        showToast("Server error", "error");
      }
    }
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

 // --- Add/Edit Table Submit ---
  if (tableForm) {
    tableForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      // ... (keep your variable definitions) ...
      const number = tableNumber.value;
      const status = tableStatus.value;

      const method = tableEditMode ? "PUT" : "POST";
      const url = tableEditMode
        ? ` /api/tables/${editTableId}`
        : " /api/tables";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ number, status }),
      });

      const data = await res.json();
      
      // Use Toast
      if (res.ok) {
        showToast(data.message || "Table saved successfully!", "success");
        closeTableModal();
        loadTables();
      } else {
        showToast(data.message || "Error saving table", "error");
      }
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