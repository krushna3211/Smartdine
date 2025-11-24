import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    // Validation: Letters, numbers, spaces, and hyphens
    match: [/^[a-zA-Z0-9\s\-]+$/, 'Inventory name contains invalid special characters']
  },
  quantity: { type: Number, required: true, min: [0, 'Quantity cannot be negative'] },
  unit: { type: String, required: true }, 
  lowStockThreshold: { type: Number, default: 5 },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model('Inventory', inventorySchema);