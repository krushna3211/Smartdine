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

    const res = await fetch("http://localhost:5000/api/inventory", {
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

  // --- Delete (Admin only) ---
  window.deleteInventory = async function (id) {
    if (!confirm("Delete this inventory item?")) return;
    await fetch(`http://localhost:5000/api/inventory/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    loadInventory();
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

  // --- Add/Edit Submit ---
  if (inventoryForm) {
    inventoryForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = itemName.value;
      const quantity = parseFloat(itemQuantity.value);
      const unit = itemUnit.value;

      const method = inventoryEditMode ? "PUT" : "POST";
      const url = inventoryEditMode
        ? `http://localhost:5000/api/inventory/${editInventoryId}`
        : "http://localhost:5000/api/inventory";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, quantity, unit }),
      });

      const data = await res.json();
      alert(data.message || "Item saved!");
      closeInventoryModal();
      loadInventory();
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