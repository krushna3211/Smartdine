// js/orders.js
document.addEventListener("DOMContentLoaded", () => {
  
  // --- Authentication ---
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  // --- Global State ---
  let menuItems = []; 
  let currentOrderItems = []; 
  let orderEditMode = false;
  let editOrderId = null;

  // --- Element Definitions ---
  const ordersTableBody = document.getElementById("ordersBody");
  const addOrderBtn = document.getElementById("addOrderBtn");
  const orderModal = document.getElementById("orderModal");
  // ... (all your other element definitions) ...
  const cancelOrderBtn = document.getElementById("cancelOrderBtn");
  const orderForm = document.getElementById("orderForm");
  const orderModalTitle = document.getElementById("orderModalTitle");
  const orderTable = document.getElementById("orderTable");
  const orderStatus = document.getElementById("orderStatus");
  const menuItemSelect = document.getElementById("menuItemSelect");
  const itemQuantity = document.getElementById("itemQuantity");
  const addItemToOrderBtn = document.getElementById("addItemToOrderBtn");
  const orderSummary = document.getElementById("orderSummary");
  const orderTotalDisplay = document.getElementById("orderTotalDisplay");
  const categoryFilter = document.getElementById("categoryFilter");
  const itemSearch = document.getElementById("itemSearch");
  const statusGroup = document.getElementById("statusGroup");
  const billingModal = document.getElementById("billingModal");
  const billDetails = document.getElementById("billDetails");
  const printBillBtn = document.getElementById("printBillBtn");
  const closeBillBtn = document.getElementById("closeBillBtn");
  const paymentBtns = document.querySelectorAll("#paymentToggle .payment-btn");
  
  let currentBillData = null; 
  let currentPaymentMethod = "Cash"; 

  // --- Payment Button Listeners ---
  if (paymentBtns) {
    paymentBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        paymentBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentPaymentMethod = btn.getAttribute("data-value");
      });
    });
  }

  // --- [UPDATED] Load All Menu Items & Categories ---
  async function loadMenuItemsAndCategories() {
    try {
      const res = await fetch("http://localhost:5000/api/menu", {
        headers: { Authorization: `Bearer ${token}` },
      });
      menuItems = await res.json(); // Save to global state

      // --- THIS IS THE FIX ---
      // We no longer scan for categories. We use the fixed list.
      if (categoryFilter) {
        const categories = [
          "Starters / Appetizers",
          "Main Course",
          "Sides",
          "Desserts",
          "Beverages"
        ];
        
        categoryFilter.innerHTML = '<option value="all">All Categories</option>'; // Reset
        categories.forEach(category => {
          const option = document.createElement('option');
          option.value = category;
          option.textContent = category;
          categoryFilter.appendChild(option);
        });
      }
      // --- END FIX ---
      
      renderMenuItemDropdown(); 
    } catch (err) { console.error("Failed to load menu items", err); }
  }
  
  // --- Render the menu dropdown based on filters ---
  function renderMenuItemDropdown() {
    if (!menuItemSelect) return;
    const category = categoryFilter.value;
    const search = itemSearch.value.toLowerCase();
    menuItemSelect.innerHTML = '<option value="">-- Select an item --</option>';
    menuItems.forEach(item => {
      if (!item.available) return; 
      const categoryMatch = (category === 'all' || item.category === category);
      const searchMatch = (item.name.toLowerCase().includes(search));
      if (categoryMatch && searchMatch) {
        const option = document.createElement('option');
        option.value = item._id;
        option.textContent = `${item.name} - ₹${item.price}`;
        menuItemSelect.appendChild(option);
      }
    });
  }

  // --- Load Available Tables ---
  async function loadAvailableTables() {
    try {
      const res = await fetch("http://localhost:5000/api/tables", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const tables = await res.json();
      if (orderTable) {
        orderTable.innerHTML = '<option value="">-- Select an available table --</option>';
        tables.forEach(table => {
          if (table.status === 'available') {
            const option = document.createElement('option');
            option.value = table.number;
            option.textContent = `Table ${table.number}`;
            orderTable.appendChild(option);
          }
        });
      }
    } catch (err) { console.error("Failed to load tables", err); }
  }

  // --- Build Order Summary ---
  function renderOrderSummary() {
    if (!orderSummary) return;
    if (currentOrderItems.length === 0) {
      orderSummary.innerHTML = "<p>No items added yet.</p>";
      return;
    }
    orderSummary.innerHTML = ""; 
    currentOrderItems.forEach((item, index) => { 
      const itemEl = document.createElement('div');
      itemEl.classList.add('order-summary-item');
      itemEl.innerHTML = `
        <span class="summary-item-name">${item.name}</span>
        <div class="quantity-control">
          <button type="button" class="qty-btn" onclick="decrementQuantity(${index})">-</button>
          <span class="qty-value">${item.quantity}</span>
          <button type="button" class="qty-btn" onclick="incrementQuantity(${index})">+</button>
        </div>
        <span class="summary-item-price">₹${(item.price * item.quantity).toFixed(2)}</span>
        <button type="button" class="remove-item-btn" onclick="removeItemFromOrder(${index})">×</button>
      `;
      orderSummary.appendChild(itemEl);
    });
  }
  
  // --- Quantity & Remove Functions ---
  window.incrementQuantity = function(index) {
    currentOrderItems[index].quantity++;
    renderOrderSummary();
    calculateTotal();
  }

  window.decrementQuantity = function(index) {
    if (currentOrderItems[index].quantity > 1) {
      currentOrderItems[index].quantity--;
      renderOrderSummary();
      calculateTotal();
    }
  }

  window.removeItemFromOrder = function(index) {
    currentOrderItems.splice(index, 1);
    renderOrderSummary();
    calculateTotal();
  }

  // --- Calculate Total ---
  function calculateTotal() {
    let total = 0;
    currentOrderItems.forEach(item => {
      total += item.price * item.quantity;
    });
    if (orderTotalDisplay) {
      orderTotalDisplay.textContent = `Total: ₹${total.toFixed(2)}`;
    }
    return total;
  }

  // --- Handle Add Item Button ---
  if (addItemToOrderBtn) {
    addItemToOrderBtn.addEventListener("click", () => {
      const selectedItemId = menuItemSelect.value;
      const quantity = parseInt(itemQuantity.value, 10);
      if (!selectedItemId) return alert("Please select a menu item.");
      if (isNaN(quantity) || quantity < 1) return alert("Please enter a valid quantity.");
      const itemDetails = menuItems.find(item => item._id === selectedItemId);
      if (!itemDetails) return alert("Error finding item details.");
      const existingItem = currentOrderItems.find(item => item.name === itemDetails.name);
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        currentOrderItems.push({
          name: itemDetails.name,
          price: itemDetails.price,
          quantity: quantity
        });
      }
      renderOrderSummary();
      calculateTotal();
      menuItemSelect.value = "";
      itemQuantity.value = "1";
      itemSearch.value = "";
    });
  }
  
  // --- Add event listeners for filters ---
  if (categoryFilter) {
    categoryFilter.addEventListener("change", renderMenuItemDropdown);
  }
  if (itemSearch) {
    itemSearch.addEventListener("keyup", renderMenuItemDropdown);
  }

  // --- Load all orders (Time Placed) ---
  async function loadOrders() {
    if (!ordersTableBody) return; 
    const res = await fetch("http://localhost:5000/api/orders?period=today", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    ordersTableBody.innerHTML = "";
    data.forEach((order) => {
      const itemsList = order.items.map(item => `${item.name} (x${item.quantity})`).join(", ");
      const placedTime = new Date(order.createdAt).toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', hour12: true
      });
      let actionButtons = `
        <button class="admin-only" onclick='editOrder(${JSON.stringify(order)})'>✏️</button>
        <button class="admin-only" onclick="deleteOrder('${order._id}')">🗑️</button>
      `;
      if (order.status === 'completed' || order.status === 'delivered') {
        actionButtons += `
          <button class="bill-btn" onclick='openBill(${JSON.stringify(order)})'>🧾</button>
        `;
      }
      const row = `
        <tr>
          <td>${order._id.slice(-6)}</td>
          <td>${order.table}</td>
          <td>${placedTime}</td>
          <td>${itemsList}</td>
          <td>
            <select onchange="updateOrderStatus('${order._id}', this.value)" ${order.status === 'paid' ? 'disabled' : ''}>
              <option value="pending" ${order.status === "pending" ? "selected" : ""}>Pending</option>
              <option value="preparing" ${order.status === "preparing" ? "selected" : ""}>Preparing</option>
              <option value="completed" ${order.status === "completed" ? "selected" : ""}>Completed</option>
              <option value="delivered" ${order.status === "delivered" ? "selected" : ""}>Delivered</option>
              ${order.status === 'paid' ? `<option value="paid" selected>Paid</option>` : ''}
            </select>
          </td>
          <td>₹${order.total.toFixed(2)}</td>
          <td>${actionButtons}</td>
        </tr>
      `;
      ordersTableBody.insertAdjacentHTML("beforeend", row);
    });
    if (role === 'staff') {
      document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    }
  }

  // --- Add/Edit Order Submit ---
  if (orderForm) {
    orderForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const table = orderTable.value;
      const status = orderStatus.value;
      const total = calculateTotal();
      if (currentOrderItems.length === 0) return alert("Cannot save an empty order.");
      if (!table) return alert("Please select an available table.");
      const method = orderEditMode ? "PUT" : "POST";
      const url = orderEditMode
        ? `http://localhost:5000/api/orders/${editOrderId}`
        : "http://localhost:5000/api/orders";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ table, items: currentOrderItems, total, status }),
      });
      const data = await res.json();
      alert(data.message || "Order saved!");
      closeOrderModal();
      loadOrders(); 
      loadAvailableTables(); 
    });
  }

  // --- Edit Order ---
  window.editOrder = function (order) {
    orderEditMode = true;
    editOrderId = order._id;
    orderModalTitle.textContent = "Edit Order";
    if (statusGroup) statusGroup.style.display = "block";
    loadAvailableTables().then(() => {
      let tableInList = Array.from(orderTable.options).some(opt => opt.value === order.table);
      if (!tableInList) {
        const option = document.createElement('option');
        option.value = order.table;
        option.textContent = `Table ${order.table} (Current)`;
        orderTable.appendChild(option);
      }
      orderTable.value = order.table;
    });
    orderStatus.value = order.status;
    currentOrderItems = [...order.items];
    renderOrderSummary();
    calculateTotal();
    openOrderModal();
  }
  
  // --- Delete & Update Status ---
  window.updateOrderStatus = async function (id, newStatus) {
    await fetch(`http://localhost:5000/api/orders/${id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus }),
    });
    if (newStatus === 'completed' || newStatus === 'delivered') {
      loadAvailableTables(); 
    }
    loadOrders(); 
  }

  window.deleteOrder = async function (id) {
    if (!confirm("Delete this order?")) return;
    await fetch(`http://localhost:5000/api/orders/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    loadOrders();
  }

  // --- Order Modal controls ---
  function openOrderModal() { if (orderModal) orderModal.classList.remove("hidden"); }
  
  function closeOrderModal() {
    if (orderModal) orderModal.classList.add("hidden");
    orderEditMode = false;
    editOrderId = null;
    currentOrderItems = [];
    if (statusGroup) statusGroup.style.display = "block";
    if (orderForm) orderForm.reset();
    renderOrderSummary();
    calculateTotal();
    if(categoryFilter) categoryFilter.value = "all";
    if(itemSearch) itemSearch.value = "";
    renderMenuItemDropdown(); 
  }
  
  if (addOrderBtn) {
    addOrderBtn.addEventListener("click", () => {
      orderEditMode = false;
      if (orderForm) orderForm.reset();
      orderStatus.value = "pending";
      if (orderModalTitle) orderModalTitle.textContent = "New Order";
      if (statusGroup) statusGroup.style.display = "none";
      currentOrderItems = [];
      renderOrderSummary();
      calculateTotal();
      loadAvailableTables();
      if(categoryFilter) categoryFilter.value = "all";
      if(itemSearch) itemSearch.value = "";
      renderMenuItemDropdown(); 
      openOrderModal();
    });
  }
  if (cancelOrderBtn) {
    cancelOrderBtn.addEventListener("click", closeOrderModal);
  }

  // === Billing Modal Functions ===
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
    if (billingModal) billingModal.classList.remove("hidden");
  }

  if (printBillBtn) {
    printBillBtn.addEventListener("click", async () => {
      if (!currentBillData) return; 
      try {
        const res = await fetch(`http://localhost:5000/api/orders/${currentBillData._id}/pay`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ paymentMethod: currentPaymentMethod }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || 'Failed to mark order as paid');
        }
        
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
        
        closeBillModal(); 
        loadOrders(); 
      
      } catch (err) {
        console.error("Failed to finalize payment:", err);
        alert(`Error: ${err.message}. Please try again.`);
      }
    });
  }

  function closeBillModal() {
    if (billingModal) billingModal.classList.add("hidden");
    currentBillData = null; 
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

  // --- Initial load ---
  loadOrders(); 
  loadMenuItemsAndCategories();
  
});