import mongoose from 'mongoose';

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  available: { type: Boolean, default: true },
  image: { type: String }, // <-- ADD THIS LINE
  createdAt: { type: Date, default: Date.now }
});
export default mongoose.model('MenuItem', menuItemSchema);
