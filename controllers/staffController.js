import Staff from '../models/Staff.js';
import bcrypt from 'bcryptjs';

// 🟢 Get all staff (This is perfect, no changes)
export const getStaff = async (req, res) => {
  try {
    const staff = await Staff.find().select('-password');
    res.json(staff);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🟢 Add new staff (This is redundant, as staff are added via /api/auth/register)
// We can leave it or remove it. It's not hurting anything.
export const addStaff = async (req, res) => {
  // ... (code is fine, but likely unused)
};


// 🟡 Update staff details (Updated to handle password changes)
export const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    // --- THIS IS THE FIX ---
    const { name, email, role, password } = req.body; // 1. Get password from body

    // 2. Create an update object
    const updateData = { name, email, role };

    // 3. If a new password was provided, hash it and add it to the update
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }
    // --- END FIX ---

    // 4. Find and update the user
    const staff = await Staff.findByIdAndUpdate(id, updateData, { new: true });
    if (!staff) return res.status(404).json({ message: 'Staff not found' });

    res.json(staff);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🔴 Delete staff (This is perfect, no changes)
export const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Staff.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Staff not found' });

    res.json({ message: 'Staff deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};