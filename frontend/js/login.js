// js/login.js
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const loginMessage = document.getElementById("loginMessage");
  const adminBtn = document.getElementById("adminBtn");
  const staffBtn = document.getElementById("staffBtn");

  let loginRole = "admin"; // Default role

  // --- Role Toggle Logic ---
  if(adminBtn && staffBtn) {
    adminBtn.addEventListener("click", () => {
      loginRole = "admin";
      adminBtn.classList.add("active");
      staffBtn.classList.remove("active");
    });
  
    staffBtn.addEventListener("click", () => {
      loginRole = "staff";
      staffBtn.classList.add("active");
      adminBtn.classList.remove("active");
    });
  }

  // --- Form Submit Logic ---
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      loginMessage.textContent = ""; // Clear old messages

      const email = emailInput.value;
      const password = passwordInput.value;

      try {
        const res = await fetch("http://localhost:5000/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, role: loginRole }),
        });

        const data = await res.json();

        if (res.ok) {
          // --- SUCCESS ---
          // Save credentials to local storage
          localStorage.setItem("token", data.token);
          localStorage.setItem("adminName", data.name);
          localStorage.setItem("role", data.role);

          // --- THIS IS THE FIX ---
          // Redirect based on role
          if (data.role === 'admin') {
            window.location.href = "dashboard.html";
          } else {
            window.location.href = "staff-dashboard.html";
          }
        } else {
          // --- FAIL ---
          loginMessage.textContent = data.message || "Login failed!";
        }
      } catch (err) {
        console.error("Login error:", err);
        loginMessage.textContent = "An error occurred. Please try again.";
      }
    });
  }
});