// Wait for the HTML document to fully load before running any code
document.addEventListener("DOMContentLoaded", () => {
  
  const token = localStorage.getItem("token");

  // --- Element Definitions ---
  const staffSection = document.getElementById("staffSection");
  const staffTableBody = document.getElementById("staffBody");
  const addStaffBtn = document.getElementById("addStaffBtn");
  const staffModal = document.getElementById("staffModal");
  const cancelBtn = document.getElementById("cancelBtn");
  const staffForm = document.getElementById("staffForm");
  const modalTitle = document.getElementById("modalTitle");

  // --- Missing Input Definitions (Added) ---
  const staffName = document.getElementById("staffName");
  const staffEmail = document.getElementById("staffEmail");
  const staffPassword = document.getElementById("staffPassword");
  const staffRole = document.getElementById("staffRole");

  let editMode = false;
  let editId = null;

  // --- Fetch and display staff ---
  async function loadStaff() {
    if (!staffTableBody) return; // Guard clause

    const res = await fetch(" /api/staff", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    staffTableBody.innerHTML = "";
    data.forEach((user) => {
      const row = `
        <tr>
          <td>${user.name}</td>
          <td>${user.email}</td>
          <td>${user.role}</td>
          <td>
            <button onclick="editStaff('${user._id}', '${user.name}', '${user.email}', '${user.role}')">✏️</button>
            <button onclick="deleteStaff('${user._id}')">🗑️</button>
          </td>
        </tr>`;
      staffTableBody.insertAdjacentHTML("beforeend", row);
    });
  }

  // --- Add or Edit Staff ---
  if (staffForm) {
    staffForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      // These variables are now correctly defined
      const name = staffName.value;
      const email = staffEmail.value;
      const password = staffPassword.value;
      const role = staffRole.value;

      const method = editMode ? "PUT" : "POST";
      const url = editMode
        ? ` /api/staff/${editId}`
        : " /api/auth/register";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "Staff member saved successfully!", "success");
       } else {
    showToast(data.message || "Error saving staff", "error");
    return; // Stop execution if error
      }

      closeModal();
      loadStaff();
    });
  }

  // --- Delete Staff ---
  // We make the function async to wait for the user's click
  window.deleteStaff = async function (id) {
    // Use our new beautiful confirmation
    if (await confirmDelete("this staff member")) {
        try {
            const res = await fetch(` /api/staff/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.ok) {
                showToast("Staff deleted successfully", "success");
                loadStaff();
            } else {
                showToast("Failed to delete staff", "error");
            }
        } catch (err) {
            showToast("Server error", "error");
        }
    }
  }

  // --- Edit Staff (opens modal) ---
  // Must be on 'window' to be called by onclick
  window.editStaff = function (id, name, email, role) {
    editMode = true;
    editId = id;
    modalTitle.textContent = "Edit Staff";
    
    // These variables are now correctly defined
    staffName.value = name;
    staffEmail.value = email;
    staffPassword.value = ""; // Don't pre-fill password
    staffRole.value = role;
    openModal();
  }

  // --- Open/Close modal ---
  if (addStaffBtn) {
    addStaffBtn.addEventListener("click", () => {
      editMode = false;
      modalTitle.textContent = "Add Staff";
      if (staffForm) staffForm.reset();
      openModal();
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", closeModal);
  }

  function openModal() {
    if (staffModal) staffModal.classList.remove("hidden");
  }

  function closeModal() {
    if (staffModal) staffModal.classList.add("hidden");
  }

  // --- Load staff on page load ---
  loadStaff();
  
}); // End of DOMContentLoaded