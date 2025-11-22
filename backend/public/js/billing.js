// js/billing.js
document.addEventListener("DOMContentLoaded", () => {
  
  const token = localStorage.getItem("token");
  const ordersToBill = document.getElementById("ordersToBill");
  const billingModal = document.getElementById("billingModal");
  const billDetails = document.getElementById("billDetails");
  const printBillBtn = document.getElementById("printBillBtn");
  const closeBillBtn = document.getElementById("closeBillBtn");
  const billingTabBtns = document.querySelectorAll("#billingTabToggle .payment-btn");
  const paymentBtns = document.querySelectorAll("#paymentToggle .payment-btn");

  let currentView = "pending";
  let currentOrderData = null; 
  let currentPaymentMethod = "Cash"; 

  // --- Toggle Tabs (Pending vs History) ---
  billingTabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      billingTabBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentView = btn.getAttribute("data-view");
      loadData(); // Decide what to load
    });
  });

  // --- Payment Method Toggle ---
  paymentBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      paymentBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentPaymentMethod = btn.getAttribute("data-value");
    });
  });

  // --- Load Data Function ---
  async function loadData() {
    ordersToBill.innerHTML = "<p style='padding: 2rem;'>Loading...</p>";
    
    if (currentView === 'pending') {
      // Load Orders
      try {
        const res = await fetch(" /api/orders", {
           headers: { Authorization: `Bearer ${token}` }
        });
        const allOrders = await res.json();
        const pendingOrders = allOrders.filter(o => o.status === 'completed' || o.status === 'delivered');
        renderList(pendingOrders, 'order');
      } catch (err) { console.error(err); }
    } else {
      // Load Bills (History) from NEW Collection
      try {
        const res = await fetch(" /api/bills", {
           headers: { Authorization: `Bearer ${token}` }
        });
        const bills = await res.json();
        renderList(bills, 'bill');
      } catch (err) { console.error(err); }
    }
  }

  // --- Render List ---
  function renderList(data, type) {
    ordersToBill.innerHTML = "";
    if (data.length === 0) {
      ordersToBill.innerHTML = `<p style='padding: 2rem;'>No records found.</p>`;
      return;
    }

    data.forEach(item => {
      const card = document.createElement("div");
      card.classList.add("billing-card");
      
      // If it's a bill, use paidAt. If order, use createdAt
      const date = new Date(item.paidAt || item.createdAt).toLocaleString();
      const btnText = type === 'order' ? "Generate Bill" : "Reprint Receipt";
      const btnClass = type === 'order' ? "primary-btn" : "secondary-btn";

      card.innerHTML = `
        <h3>Table ${item.table} (${type === 'order' ? 'Order' : 'Bill'})</h3>
        <p>Total: ₹${item.total.toFixed(2)}</p>
        <p style="font-size:0.8rem; color:gray;">${date}</p>
        <button class="${btnClass}" onclick='openBill(${JSON.stringify(item)}, "${type}")'>${btnText}</button>
      `;
      ordersToBill.appendChild(card);
    });
  }

  // --- Open Modal ---
  window.openBill = function(data, type) {
    currentOrderData = data;
    // ... (HTML generation same as before) ...
    const tax = data.total * 0.05; 
    const grandTotal = data.total + tax;
    
    billDetails.innerHTML = `
        <h4>Table: ${data.table}</h4>
        <table style="width:100%; border-collapse: collapse; margin-top:10px;">
          <thead><tr><th align="left">Item</th><th align="center">Qty</th><th align="right">Price</th></tr></thead>
          <tbody>
            ${data.items.map(i => `<tr><td>${i.name}</td><td align="center">${i.quantity}</td><td align="right">₹${i.price * i.quantity}</td></tr>`).join("")}
          </tbody>
        </table>
        <hr><p><strong>Total: ₹${grandTotal.toFixed(2)}</strong></p>
    `;

    const paymentSection = document.querySelector('.payment-section');
    
    // If viewing history (Bill), hide payment buttons
    if (type === 'bill') {
      paymentSection.style.display = 'none';
      printBillBtn.textContent = "🖨️ Print Receipt";
      // Set method for printing logic
      currentPaymentMethod = data.paymentMethod; 
    } else {
      paymentSection.style.display = 'block';
      printBillBtn.textContent = "🧾 Finalize & Print";
    }
    
    billingModal.classList.remove("hidden");
  }

  // --- Finalize / Print ---
  printBillBtn.addEventListener("click", async () => {
    // If pending order, save to BILLS collection first
    if (currentView === 'pending') {
      try {
        const res = await fetch("/api/bills/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ 
            orderId: currentOrderData._id, 
            paymentMethod: currentPaymentMethod 
          }),
        });
        if (!res.ok) throw new Error("Failed to generate bill");
        
        if(window.showToast) showToast("Bill Saved Successfully!", "success");
      } catch (err) {
        console.error(err);
        if(window.showToast) showToast("Error saving bill", "error");
        return;
      }
    }

    // Print Logic (Same as before)
    const w = window.open("", "", "height=600,width=800");
    w.document.write("<html><body>" + billDetails.innerHTML + "</body></html>");
    w.document.close();
    w.print();
    
    billingModal.classList.add("hidden");
    loadData(); // Refresh lists
  });

  closeBillBtn.addEventListener("click", () => billingModal.classList.add("hidden"));
  document.getElementById("refreshBillsBtn").addEventListener("click", loadData);

  loadData(); // Initial Load
});