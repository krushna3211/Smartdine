import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  quantity: { type: Number, required: true, default: 0 },
  unit: { type: String, required: true }, // e.g. kg, g, L, pcs
  lowStockThreshold: { type: Number, default: 5 },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model('Inventory', inventorySchema);
