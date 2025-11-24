import mongoose from 'mongoose';

const billSchema = new mongoose.Schema({
  orderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Order', 
    required: true 
  },
  table: { type: String, required: true },
  
  // We copy the items array here so the bill is a snapshot in time
  items: [
    {
      name: String,
      price: Number,
      quantity: Number
    }
  ],
  
  total: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['Cash', 'Card', 'UPI'], required: true },
  paidAt: { type: Date, default: Date.now }
});

export default mongoose.model('Bill', billSchema);