// js/billing.js
document.addEventListener("DOMContentLoaded", () => {
  
  const token = localStorage.getItem("token");

  // --- Element Definitions ---
  const ordersToBill = document.getElementById("ordersToBill");
  const billingModal = document.getElementById("billingModal");
  const billDetails = document.getElementById("billDetails");
  const refreshBillsBtn = document.getElementById("refreshBillsBtn");
  const printBillBtn = document.getElementById("printBillBtn");
  const closeBillBtn = document.getElementById("closeBillBtn");

  const paymentToggle = document.getElementById("paymentToggle");
  const paymentBtns = document.querySelectorAll("#paymentToggle .payment-btn");
  
  // --- NEW: Billing Tabs ---
  const billingTabBtns = document.querySelectorAll("#billingTabToggle .payment-btn");

  let currentBillData = null; 
  let currentPaymentMethod = "Cash"; 
  let currentView = "pending"; // 'pending' or 'history'

  // --- Tab Toggle Logic ---
  if (billingTabBtns) {
    billingTabBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        billingTabBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentView = btn.getAttribute("data-view");
        loadOrdersToBill(); // Reload list based on new view
      });
    });
  }

  // --- Payment Method Toggle Logic ---
  if (paymentBtns) {
    paymentBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        paymentBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentPaymentMethod = btn.getAttribute("data-value");
      });
    });
  }

  // --- 1. Load Orders (Updated for History) ---
  async function loadOrdersToBill() {
    if (!ordersToBill) return;
    ordersToBill.innerHTML = "<p style='padding: 2rem;'>Loading...</p>";

    try {
      const res = await fetch("http://localhost:5000/api/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const allOrders = await res.json();
      let filteredOrders = [];

      // --- Filter Logic ---
      if (currentView === 'pending') {
        filteredOrders = allOrders.filter(
          order => order.status === 'completed' || order.status === 'delivered'
        );
      } else {
        // History View: Show 'paid' orders (newest first)
        filteredOrders = allOrders.filter(order => order.status === 'paid').reverse();
      }

      ordersToBill.innerHTML = "";
      
      if (filteredOrders.length === 0) {
        ordersToBill.innerHTML = `<p style='padding: 2rem;'>No ${currentView} bills found.</p>`;
        return;
      }

      filteredOrders.forEach((order) => {
        const card = document.createElement("div");
        card.classList.add("billing-card");
        
        // Different button style for History
        const btnText = currentView === 'pending' ? "Generate Bill" : "Reprint Receipt";
        const btnClass = currentView === 'pending' ? "primary-btn" : "secondary-btn";

        card.innerHTML = `
          <h3>Table ${order.table} (Order #${order._id.slice(-6)})</h3>
          <p>Total: ₹${order.total.toFixed(2)}</p>
          <p style="font-size:0.8rem; color:gray;">${new Date(order.createdAt).toLocaleString()}</p>
          <button class="${btnClass}" onclick='openBill(${JSON.stringify(order)})'>${btnText}</button>
        `;
        ordersToBill.appendChild(card);
      });
    } catch (err) {
      console.error(err);
      ordersToBill.innerHTML = "<p style='padding: 2rem;'>Error loading bills.</p>";
    }
  }

  // --- 2. Open Bill Modal (Updated to Hide/Show Payment Options) ---
  window.openBill = function(order) {
    currentBillData = order; 
    const tax = order.total * 0.05; 
    const grandTotal = order.total + tax;

    // Update Modal Content
    if (billDetails) {
      billDetails.innerHTML = `
        <h4>Table: ${order.table}</h4>
        <p>Order ID: ${order._id}</p>
        ${order.status === 'paid' ? `<p style='color:green; font-weight:bold;'>PAID via ${order.paymentMethod}</p>` : ''}
        <table style="width:100%; border-collapse: collapse; margin-top:10px;">
          <thead>
            <tr><th align="left">Item</th><th align="center">Qty</th><th align="right">Price</th></tr>
          </thead>
          <tbody>
            ${order.items.map(item => 
              `<tr>
                 <td>${item.name}</td>
                 <td align="center">${item.quantity}</td>
                 <td align="right">₹${(item.price * item.quantity).toFixed(2)}</td>
               </tr>`
            ).join("")}
          </tbody>
        </table>
        <hr style="margin: 10px 0;">
        <p style="display:flex; justify-content: space-between;">
          <strong>Subtotal:</strong>
          <span>₹${order.total.toFixed(2)}</span>
        </p>
        <p style="display:flex; justify-content: space-between;">
          <strong>Tax (5%):</strong>
          <span>₹${tax.toFixed(2)}</span>
        </p>
        <hr style="margin: 10px 0;">
        <p style="display:flex; justify-content: space-between; font-size: 1.2rem;">
          <strong>Grand Total:</strong>
          <strong>₹${grandTotal.toFixed(2)}</strong>
        </p>
      `;
    }

    // --- Logic for History Mode ---
    const paymentSection = document.querySelector('.payment-section');
    
    if (order.status === 'paid') {
      // If already paid, hide payment options and change button text
      if(paymentSection) paymentSection.style.display = 'none';
      printBillBtn.textContent = "🖨️ Print Receipt";
    } else {
      // If pending, show options
      if(paymentSection) paymentSection.style.display = 'block';
      printBillBtn.textContent = "🧾 Finalize & Print";
    }

    if (billingModal) billingModal.classList.remove("hidden");
  }

  // --- 3. Print/Finalize Bill (Updated) ---
  if (printBillBtn) {
    printBillBtn.addEventListener("click", async () => {
      if (!currentBillData) return; 

      // If it's NOT paid yet, we need to call the API
      if (currentBillData.status !== 'paid') {
        try {
          const res = await fetch(`http://localhost:5000/api/orders/${currentBillData._id}/pay`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ paymentMethod: currentPaymentMethod }),
          });
          
          if (!res.ok) {
            const errData = await res.json();
            // Use showToast if you have it, else alert
            if(window.showToast) showToast(errData.message, "error");
            else alert(errData.message);
            return;
          }
          // Success toast
          if(window.showToast) showToast("Payment Successful!", "success");

        } catch (err) {
          console.error("Payment error:", err);
          return;
        }
      }

      // --- Print Logic (Runs for both Pending and History) ---
      const printContents = billDetails.innerHTML;
      const w = window.open("", "", "height=600,width=800");
      w.document.write("<html><head><title>SmartDine Bill</title></head><body>");
      w.document.write("<h2>🍽️ SmartDine POS Bill</h2><hr>");
      w.document.write(printContents);
      // If it was just paid, use current method. If history, use stored method.
      const method = currentBillData.paymentMethod || currentPaymentMethod;
      w.document.write(`<hr><p><strong>Payment Method: ${method}</strong></p>`);
      w.document.write("</body></html>");
      w.document.close();
      w.print();
      w.close();
      
      closeBillModal(); 
      loadOrdersToBill(); 
    });
  }

  // --- 4. Close Modal ---
  function closeBillModal() {
    if (billingModal) billingModal.classList.add("hidden");
    currentBillData = null; 
    // Reset buttons
    if (paymentBtns) {
      paymentBtns.forEach(btn => {
        if (btn.getAttribute('data-value') === 'Cash') btn.classList.add('active');
        else btn.classList.remove('active');
      });
      currentPaymentMethod = "Cash";
    }
  }

  if (closeBillBtn) closeBillBtn.addEventListener("click", closeBillModal);
  if (refreshBillsBtn) refreshBillsBtn.addEventListener("click", loadOrdersToBill);

  // --- Initial Load ---
  loadOrdersToBill();

}); // End of DOMContentLoaded