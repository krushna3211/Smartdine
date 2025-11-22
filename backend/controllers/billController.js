import Bill from '../models/Bill.js';
import Order from '../models/Order.js';
import Table from '../models/Table.js';

// 🟢 Generate Bill (Move Order -> Bill)
export const generateBill = async (req, res) => {
  try {
    const { orderId, paymentMethod } = req.body;

    // 1. Find the Order
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // 2. Create the Bill Record (Copying data)
    const bill = await Bill.create({
      orderId: order._id,
      table: order.table,
      items: order.items,
      total: order.total,
      paymentMethod: paymentMethod,
      paidAt: Date.now()
    });

    // 3. Update Order Status to 'paid'
    order.status = 'paid';
    await order.save();

    // 4. Free up the Table
    const tableToUpdate = await Table.findOne({ number: Number(order.table) });
    if (tableToUpdate) {
      tableToUpdate.status = 'available';
      await tableToUpdate.save();
    }

    res.status(201).json({ message: 'Bill generated successfully', bill });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🟢 Get Bill History
export const getBillHistory = async (req, res) => {
  try {
    // Fetch bills, newest first
    const bills = await Bill.find().sort({ paidAt: -1 });
    res.json(bills);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};