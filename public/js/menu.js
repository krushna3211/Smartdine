// js/menu.js
document.addEventListener("DOMContentLoaded", () => {
  
  // --- Authentication ---
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  // --- Element Definitions ---
  const menuTableBody = document.getElementById("menuBody");
  const addMenuBtn = document.getElementById("addMenuBtn");
  const menuModal = document.getElementById("menuModal");
  const cancelMenuBtn = document.getElementById("cancelMenuBtn");
  const menuForm = document.getElementById("menuForm");
  const menuModalTitle = document.getElementById("menuModalTitle");

  // Form Inputs
  const menuName = document.getElementById("menuName");
  const menuCategory = document.getElementById("menuCategory");
  const menuPrice = document.getElementById("menuPrice");
  const menuImage = document.getElementById("menuImage");
  const menuAvailable = document.getElementById("menuAvailable");

  let menuEditMode = false;
  let editMenuId = null;

  // --- Load menu items ---
  async function loadMenu() {
    if (!menuTableBody) return; // Make sure element exists

    const res = await fetch("http://localhost:5000/api/menu", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    menuTableBody.innerHTML = "";
    data.forEach((item) => {
      const row = `
        <tr>
          <td>${item.name}</td>
          <td>${item.category}</td>
          <td>₹${item.price}</td>
          <td>${item.available ? "✅" : "❌"}</td>
          <td>
            <button class="admin-only" onclick="editMenu('${item._id}', '${item.name}', '${item.category}', '${item.price}', ${item.available}, '${item.image || ""}')">✏️</button>
            <button class="admin-only" onclick="deleteMenu('${item._id}')">🗑️</button>
          </td>
        </tr>
      `;
      // Note: Added 'admin-only' class to buttons
      menuTableBody.insertAdjacentHTML("beforeend", row);
    });

    // After loading, run the admin check from dashboard.js
    if (role === 'staff') {
      document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = 'none';
      });
    }
  }

  // --- Add/Edit Menu Item Submit ---
  if (menuForm) {
    menuForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      // ... (your variable definitions: name, category, etc. keep them!) ...
      const name = menuName.value;
      const category = menuCategory.value;
      const price = parseFloat(menuPrice.value);
      const image = menuImage.value;
      const available = menuAvailable.checked;

      const method = menuEditMode ? "PUT" : "POST";
      const url = menuEditMode
        ? `http://localhost:5000/api/menu/${editMenuId}`
        : "http://localhost:5000/api/menu";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, category, price, image, available }),
      });

      const data = await res.json();
      
      // Use Toast for success/failure
      if (res.ok) {
        showToast(data.message || "Menu item saved successfully!", "success");
        closeMenuModal();
        loadMenu();
      } else {
        showToast(data.message || "Error saving item", "error");
      }
    });
  }

  // --- Delete Menu Item ---
  window.deleteMenu = async function (id) {
    // Use SweetAlert for confirmation
    if (await confirmDelete("this menu item")) {
      try {
        const res = await fetch(`http://localhost:5000/api/menu/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (res.ok) {
          showToast("Menu item deleted successfully", "success");
          loadMenu();
        } else {
          showToast("Failed to delete item", "error");
        }
      } catch (err) {
        showToast("Server error", "error");
      }
    }
  }


  // --- Edit Menu Item ---
  window.editMenu = function (id, name, category, price, available, image) {
    menuEditMode = true;
    editMenuId = id;
    menuModalTitle.textContent = "Edit Menu Item";
    
    menuName.value = name;
    menuCategory.value = category;
    menuPrice.value = price;
    menuAvailable.checked = available;
    menuImage.value = image;
    openMenuModal();
  }

  // --- Modal controls ---
  if (addMenuBtn) {
    addMenuBtn.addEventListener("click", () => {
      menuEditMode = false;
      if (menuForm) menuForm.reset();
      menuAvailable.checked = true; // Default to checked
      if (menuModalTitle) menuModalTitle.textContent = "Add Menu Item";
      openMenuModal();
    });
  }

  if (cancelMenuBtn) {
    cancelMenuBtn.addEventListener("click", closeMenuModal);
  }

  function openMenuModal() {
    if (menuModal) menuModal.classList.remove("hidden");
  }

  function closeMenuModal() {
    if (menuModal) menuModal.classList.add("hidden");
  }

  // --- Initial Load ---
  loadMenu();
  
}); // End of DOMContentLoaded