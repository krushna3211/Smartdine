import mongoose from 'mongoose';

// We create a "sub-schema" for the items
const orderItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  }
});

const orderSchema = new mongoose.Schema({
  table: { 
    type: String, 
    required: true 
  },
  
  // 'items' is now an array of the sub-schema objects
  items: [orderItemSchema],
  
 // ...
  status: {
    type: String,
    enum: ['pending', 'preparing', 'completed', 'delivered', 'paid'], // <-- 1. Add 'paid'
    default: 'pending'
  },
  
  total: { 
    type: Number, 
    required: true 
  },
  
  // --- ADD THESE NEW FIELDS ---
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Card', 'UPI', null], // Allowed payment types
    default: null
  },
  paidAt: {
    type: Date
  },
  // --- END NEW FIELDS ---
  
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

export default mongoose.model('Order', orderSchema);