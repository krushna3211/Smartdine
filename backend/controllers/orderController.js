import Order from '../models/Order.js';
import Table from '../models/Table.js';

// 🟢 Get all orders (UPDATED)
export const getOrders = async (req, res) => {
  try {
    const { period } = req.query; // Check for a query param like ?period=today

    let query = {}; // Start with an empty query (gets all orders)

    // If the frontend asks for "today", we build a date filter
    if (period === 'today') {
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0); // Start of today
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999); // End of today
      
      query = { createdAt: { $gte: startDate, $lte: endDate } };
    }
    
    const orders = await Order.find(query);
    
    res.json(orders);
  } catch (err) {
 res.status(500).json({ message: err.message });
 }
};

// 🟢 Create a new order (FIXED)
export const createOrder = async (req, res) => {
  try {
    const { table, items, total, status } = req.body;

    const order = await Order.create({
      table, // Saves the string (e.g., "4")
      items,
      total,
      status
    });

    // --- THIS IS THE FIX ---
    // Convert the string "4" into the number 4 for the query
    const tableToUpdate = await Table.findOne({ number: Number(table) });
    // --- END FIX ---
    
    if (tableToUpdate) {
      tableToUpdate.status = 'occupied';
      await tableToUpdate.save();
    } else {
      console.error('ERROR: Could not find a table with number:', table);
    }

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🟡 Update FULL Order (Admin only)
export const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    // The frontend sends the full, recalculated order
    const { table, items, total, status } = req.body;

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { table, items, total, status },
      { new: true } 
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json(updatedOrder);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🟡 Update order STATUS (CORRECTED)
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; 

    const order = await Order.findByIdAndUpdate(
      id,
      { status: status },
      { new: true }
    ); 

    if (!order) return res.status(404).json({ message: 'Order not found' });
    
    // The logic to free the table has been removed.

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// 🔴 Delete order (No change needed)
export const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Order.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Order not found' });

    res.json({ message: 'Order deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🟢 Mark an order as paid (CORRECTED)
export const payOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod } = req.body; 

    // Find the order
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Update the order with payment details
    order.status = 'paid';
    order.paymentMethod = paymentMethod;
    order.paidAt = Date.now();
    
    await order.save();

    // --- THIS IS THE FIX ---
    // Now that the order is paid, free the table.
    const tableToUpdate = await Table.findOne({ number: Number(order.table) });
    if (tableToUpdate) {
      tableToUpdate.status = 'available';
      await tableToUpdate.save();
    }
    // --- END FIX ---

    res.json({ message: 'Order marked as paid', order });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};