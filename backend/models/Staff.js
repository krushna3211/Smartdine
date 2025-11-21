import mongoose from 'mongoose';

const staffSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Name is required'],
    trim: true,
    // Validation: Only letters and spaces allowed
    match: [/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces']
  },
  email: { 
    type: String, 
    unique: true, 
    required: [true, 'Email is required'],
    lowercase: true,
    // Validation: Basic email format check
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
  },
  password: { 
    type: String, 
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'] 
  },
  role: { 
    type: String, 
    enum: ['admin', 'staff'], 
    default: 'staff' 
  },
});

export default mongoose.model('Staff', staffSchema);