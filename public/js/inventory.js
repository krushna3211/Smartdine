// js/inventory.js
document.addEventListener("DOMContentLoaded", () => {
  
  // --- Authentication ---
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  // --- Element Definitions ---
  const inventoryGrid = document.getElementById("inventoryGrid");
  const addInventoryBtn = document.getElementById("addInventoryBtn");
  const inventoryModal = document.getElementById("inventoryModal");
  const cancelInventoryBtn = document.getElementById("cancelInventoryBtn");
  const inventoryForm = document.getElementById("inventoryForm");
  const inventoryModalTitle = document.getElementById("inventoryModalTitle");

  // Form Inputs
  const itemName = document.getElementById("itemName");
  const itemQuantity = document.getElementById("itemQuantity");
  const itemUnit = document.getElementById("itemUnit"); // For 'kg', 'pcs', etc.

  let inventoryEditMode = false;
  let editInventoryId = null;

  // --- Load Inventory ---
  async function loadInventory() {
    if (!inventoryGrid) return; // Make sure element exists

    const res = await fetch("/api/inventory", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    inventoryGrid.innerHTML = "";
    data.forEach((item) => {
      const card = document.createElement("div");
      card.classList.add("inventory-card");
      // Add 'low-stock' class if quantity is 10 or less
      if (item.quantity <= 10) {
        card.classList.add("low-stock");
      }

      card.innerHTML = `
        <h3>${item.name}</h3>
        <p>${item.quantity} ${item.unit || ''}</p>
        <div class="admin-only">
          <button onclick="editInventory('${item._id}', '${item.name}', '${item.quantity}', '${item.unit || ''}')">✏️</button>
          <button onclick="deleteInventory('${item._id}')">🗑️</button>
        </div>
      `;

      inventoryGrid.appendChild(card);
    });

    // After loading, run the admin check from dashboard.js
    if (role === 'staff') {
      document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = 'none';
      });
    }
  }

// --- Delete Inventory Item ---
  window.deleteInventory = async function (id) {
    // Use SweetAlert
    if (await confirmDelete("this inventory item")) {
      try {
        const res = await fetch(` /api/inventory/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (res.ok) {
          showToast("Item deleted successfully", "success");
          loadInventory();
        } else {
          showToast("Failed to delete item", "error");
        }
      } catch (err) {
        showToast("Server error", "error");
      }
    }
  }

  // --- Edit (Admin only) ---
  window.editInventory = function (id, name, quantity, unit) {
    inventoryEditMode = true;
    editInventoryId = id;
    inventoryModalTitle.textContent = "Edit Inventory Item";
    
    itemName.value = name;
    itemQuantity.value = quantity;
    itemUnit.value = unit;
    openInventoryModal();
  }

  // --- Add/Edit Inventory Submit ---
  if (inventoryForm) {
    inventoryForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      // ... (keep variable definitions) ...
      const name = itemName.value;
      const quantity = parseFloat(itemQuantity.value);
      const unit = itemUnit.value;

      const method = inventoryEditMode ? "PUT" : "POST";
      const url = inventoryEditMode
        ? ` /api/inventory/${editInventoryId}`
        : " /api/inventory";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, quantity, unit }),
      });

      const data = await res.json();
      
      // Use Toast
      if (res.ok) {
        showToast(data.message || "Inventory item saved!", "success");
        closeInventoryModal();
        loadInventory();
      } else {
        showToast(data.message || "Error saving item", "error");
      }
    });
  }

  // --- Modal controls ---
  if (addInventoryBtn) {
    addInventoryBtn.addEventListener("click", () => {
      inventoryEditMode = false;
      if (inventoryForm) inventoryForm.reset();
      if (inventoryModalTitle) inventoryModalTitle.textContent = "Add Inventory Item";
      openInventoryModal();
    });
  }

  if (cancelInventoryBtn) {
    cancelInventoryBtn.addEventListener("click", closeInventoryModal);
  }

  function openInventoryModal() {
    if (inventoryModal) inventoryModal.classList.remove("hidden");
  }
  function closeInventoryModal() {
    if (inventoryModal) inventoryModal.classList.add("hidden");
  }

  // --- Initial Load ---
  loadInventory();

}); // End of DOMContentLoaded