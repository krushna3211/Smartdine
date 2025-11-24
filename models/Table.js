// models/tableModel.js
import mongoose from 'mongoose';

const tableSchema = new mongoose.Schema({
  number: { type: Number, required: true, unique: true }, // <-- MUST be 'Number'
  status: {
    type: String,
    enum: ['available', 'occupied', 'reserved'],
    default: 'available'
  },
  capacity: { type: Number, default: 4 },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Table', tableSchema);