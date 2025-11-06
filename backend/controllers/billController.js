import Bill from '../models/Bill.js';
import Order from '../models/Order.js';

// 🟢 Generate Bill for an order
export const generateBill = async (req, res) => {
  try {
    const { orderId, paymentMethod, tax = 5, serviceCharge = 2 } = req.body;

    const order = await Order.findById(orderId).populate('items.menuItem');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const items = order.items.map(i => ({
      name: i.menuItem.name,
      quantity: i.quantity,
      price: i.menuItem.price,
      total: i.menuItem.price * i.quantity
    }));

    const subtotal = items.reduce((acc, i) => acc + i.total, 0);
    const taxAmount = (subtotal * tax) / 100;
    const serviceChargeAmount = (subtotal * serviceCharge) / 100;
    const totalAmount = subtotal + taxAmount + serviceChargeAmount;

    const bill = await Bill.create({
      orderId,
      tableNumber: order.tableNumber,
      items,
      subtotal,
      tax: taxAmount,
      serviceCharge: serviceChargeAmount,
      totalAmount,
      paymentMethod,
      status: 'paid'
    });

    // Optionally mark order as "completed"
    order.status = 'completed';
    await order.save();

    res.status(201).json(bill);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 📋 Get all bills
export const getAllBills = async (req, res) => {
  try {
    const bills = await Bill.find().populate('orderId');
    res.json(bills);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 📄 Get single bill details
export const getBillById = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id).populate('orderId');
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    res.json(bill);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🗑️ Delete a bill (admin only)
export const deleteBill = async (req, res) => {
  try {
    const deleted = await Bill.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Bill not found' });
    res.json({ message: 'Bill deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
