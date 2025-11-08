import Table from '../models/Table.js';

// 🟢 Get all tables
export const getTables = async (req, res) => {
  try {
    const tables = await Table.find();
    res.json(tables);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🟢 Add a new table (Admin only) (FIXED)
export const addTable = async (req, res) => {
  try {
    const { number, capacity, status } = req.body;
    
    // --- THIS IS THE FIX ---
    const numValue = Number(number);
    if (isNaN(numValue)) {
      return res.status(400).json({ message: 'Table number must be a valid number.' });
    }
    const existing = await Table.findOne({ number: numValue });
    // --- END FIX ---

    if (existing) return res.status(400).json({ message: 'Table number already exists' });

    const table = await Table.create({ number: numValue, capacity, status });
    res.status(201).json(table);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🟡 Update FULL Table (Admin only) (FIXED)
export const updateTable = async (req, res) => {
  try {
    const { id } = req.params;
    const { number, status } = req.body; 

    // --- THIS IS THE FIX ---
    const numValue = Number(number);
    if (isNaN(numValue)) {
      return res.status(400).json({ message: 'Table number must be a valid number.' });
    }
    const existing = await Table.findOne({ number: numValue, _id: { $ne: id } });
    // --- END FIX ---
    
    if (existing) return res.status(400).json({ message: 'Table number already exists' });

    const table = await Table.findByIdAndUpdate(
      id,
      { number: numValue, status }, // Update with the number
      { new: true }
    );

    if (!table) return res.status(404).json({ message: 'Table not found' });
    res.json(table);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// 🟡 Update Table STATUS (Staff & Admin) - SECURED
export const updateTableStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // This is the NEW status
    const userRole = req.user.role; // Get the user's role from the token

    // --- THIS IS THE NEW LOGIC ---
    // 1. Find the table first, *before* updating
    const table = await Table.findById(id);
    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }

    // 2. Check for the security rule
    if (table.status === 'reserved' && userRole === 'staff') {
      return res.status(403).json({ 
        message: 'Access denied. Only an admin can change the status of a reserved table.' 
      });
    }
    // --- END NEW LOGIC ---

    // 3. If the check passes, update the table
    table.status = status;
    await table.save();

    res.json(table); // Send back the updated table

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// 🔴 Delete table (Admin only)
export const deleteTable = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Table.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Table not found' });

    res.json({ message: 'Table deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};