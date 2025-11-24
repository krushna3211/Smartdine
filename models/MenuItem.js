import mongoose from 'mongoose';

const menuItemSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
    // Validation: Letters, numbers, spaces, brackets (), and hyphens -
    match: [/^[a-zA-Z0-9\s\(\)\-]+$/, 'Item name contains invalid special characters']
  },
  category: { type: String, required: true },
  price: { type: Number, required: true, min: [0, 'Price cannot be negative'] },
  available: { type: Boolean, default: true },
  image: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('MenuItem', menuItemSchema);