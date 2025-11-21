// js/billing.js
document.addEventListener("DOMContentLoaded", () => {
  
  // --- Authentication ---
  const token = localStorage.getItem("token");

  // --- Element Definitions ---
  const ordersToBill = document.getElementById("ordersToBill");
  const billingModal = document.getElementById("billingModal");
  const billDetails = document.getElementById("billDetails");
  const refreshBillsBtn = document.getElementById("refreshBillsBtn");
  const printBillBtn = document.getElementById("printBillBtn");
  const closeBillBtn = document.getElementById("closeBillBtn");

  // --- Payment Elements ---
  const paymentToggle = document.getElementById("paymentToggle");
  const paymentBtns = document.querySelectorAll("#paymentToggle .payment-btn");
  
  let currentBillData = null; // To store the order data
  let currentPaymentMethod = "Cash"; // Default payment method

  // --- Add click listeners for payment buttons ---
  if (paymentBtns) {
    paymentBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        paymentBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentPaymentMethod = btn.getAttribute("data-value");
      });
    });
  }

  // --- 1. Load Orders to Bill (No changes) ---
  async function loadOrdersToBill() {
    if (!ordersToBill) return;
    const res = await fetch("http://localhost:5000/api/orders", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const allOrders = await res.json();
    const billableOrders = allOrders.filter(
      order => order.status === 'completed' || order.status === 'delivered'
    );
    ordersToBill.innerHTML = "";
    if (billableOrders.length === 0) {
      ordersToBill.innerHTML = "<p style='padding: 2rem;'>No orders are ready for billing.</p>";
      return;
    }
    billableOrders.forEach((order) => {
      const card = document.createElement("div");
      card.classList.add("billing-card");
      card.innerHTML = `
        <h3>Table ${order.table} (Order #${order._id.slice(-6)})</h3>
        <p>Total: ₹${order.total.toFixed(2)}</p>
        <button class="primary-btn" onclick='openBill(${JSON.stringify(order)})'>Generate Bill</button>
      `;
      ordersToBill.appendChild(card);
    });
  }

  // --- 2. Open Bill Modal (No changes) ---
  window.openBill = function(order) {
    currentBillData = order; 
    const tax = order.total * 0.05; 
    const grandTotal = order.total + tax;
    if (billDetails) {
      billDetails.innerHTML = `
        <h4>Table: ${order.table}</h4>
        <p>Order ID: ${order._id}</p>
        <table style="width:100%; border-collapse: collapse; margin-top:10px;">
          <thead>
            <tr>
              <th align="left">Item</th>
              <th align="center">Qty</th>
              <th align="right">Price</th>
            </tr>
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
    if (billingModal) billingModal.classList.remove("hidden");
  }

  // --- 3. Print/Finalize Bill (UPDATED) ---
  if (printBillBtn) {
    // Make the function ASYNC to wait for the fetch
    printBillBtn.addEventListener("click", async () => {
      if (!currentBillData) return; // Safety check

      try {
        // --- THIS IS THE NEW BACKEND CALL ---
        const res = await fetch(`http://localhost:5000/api/orders/${currentBillData._id}/pay`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ paymentMethod: currentPaymentMethod }),
        });
        
        if (!res.ok) {
          const errData = await res.json();
          // Use Error Toast
          showToast(errData.message || 'Failed to mark order as paid', "error");
          return;
      }
      
      // Use Success Toast
      showToast("Payment Successful! Printing Bill...", "success");
        
        // --- Payment was saved, NOW print the bill ---
        const printContents = billDetails.innerHTML;
        const w = window.open("", "", "height=600,width=800");
        w.document.write("<html><head><title>SmartDine Bill</title></head><body>");
        w.document.write("<h2>🍽️ SmartDine POS Bill</h2><hr>");
        w.document.write(printContents);
        w.document.write(`<hr><p><strong>Payment Method: ${currentPaymentMethod}</strong></p>`);
        w.document.write("</body></html>");
        w.document.close();
        w.print();
        w.close();
        
        // Close modal and refresh the list (order will be gone)
        closeBillModal();
        loadOrdersToBill();
      
      } catch (err) {
        console.error("Failed to finalize payment:", err);
        showToast(`Error: ${err.message}. Please try again.`, "error");
      }
    });
  }

  // --- 4. Close Bill Modal (UPDATED) ---
  function closeBillModal() {
    if (billingModal) billingModal.classList.add("hidden");
    currentBillData = null; // Clear saved data
    
    // Reset payment buttons to default 'Cash'
    if (paymentBtns) {
      paymentBtns.forEach(btn => {
        if (btn.getAttribute('data-value') === 'Cash') {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
      currentPaymentMethod = "Cash";
    }
  }

  if (closeBillBtn) {
    closeBillBtn.addEventListener("click", closeBillModal);
  }

  if (refreshBillsBtn) {
    refreshBillsBtn.addEventListener("click", loadOrdersToBill);
  }

  // --- Initial Load ---
  loadOrdersToBill();

}); // End of DOMContentLoaded