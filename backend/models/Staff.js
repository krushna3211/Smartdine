import mongoose from 'mongoose';

const staffSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['admin', 'staff'], default: 'staff' },
});

export default mongoose.model('Staff', staffSchema);
