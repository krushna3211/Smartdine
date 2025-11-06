import mongoose from 'mongoose';

const billSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  tableNumber: { type: String, required: true },
  items: [
    {
      name: String,
      quantity: Number,
      price: Number,
      total: Number
    }
  ],
  subtotal: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  serviceCharge: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'upi'],
    required: true
  },
  status: {
    type: String,
    enum: ['paid', 'unpaid'],
    default: 'paid'
  },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Bill', billSchema);
