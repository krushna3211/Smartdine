// js/login.js
function showToast(message, type = "success") {
  let backgroundColor;
  if (type === "success") {
    backgroundColor = "linear-gradient(to right, #e67e22, #f39c12)"; 
  } else {
    backgroundColor = "linear-gradient(to right, #e74c3c, #c0392b)"; 
  }

  Toastify({
    text: message,
    duration: 3000, 
    close: true,
    gravity: "top", 
    position: "right", 
    style: {
      background: backgroundColor,
      borderRadius: "8px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
    },
  }).showToast();
}

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
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, role: loginRole }),
        });

        const data = await res.json();

        if (res.ok) {
         
          // Save credentials to local storage
          localStorage.setItem("token", data.token);
          localStorage.setItem("adminName", data.name);
          localStorage.setItem("role", data.role);

          showToast("Login successful! Redirecting...", "success");
        
          // Redirect based on role
          setTimeout(() => {
             if (data.role === 'admin') window.location.href = "dashboard.html";
             else window.location.href = "staff-dashboard.html";
          }, 1000); // Small delay to see the toast

        } else {
          // Instead of loginMessage.textContent...
          showToast(data.message || "Login failed!", "error");
        }
      } catch (err) {
        console.error("Login error:", err);
        loginMessage.textContent = "An error occurred. Please try again.";
      }
    });
  }
});