import Inventory from '../models/Inventory.js';

// 🟢 Get all inventory items
export const getInventory = async (req, res) => {
  try {
    const inventory = await Inventory.find();
    res.json(inventory);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🟢 Add new inventory item
export const addInventoryItem = async (req, res) => {
  try {
    const { name, quantity, unit, lowStockThreshold } = req.body;

    const existingItem = await Inventory.findOne({ name });
    if (existingItem)
      return res.status(400).json({ message: 'Item already exists' });

    const newItem = await Inventory.create({
      name,
      quantity,
      unit,
      lowStockThreshold
    });

    res.status(201).json(newItem);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🟡 Update inventory item
export const updateInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const item = await Inventory.findByIdAndUpdate(id, updates, { new: true });
    if (!item) return res.status(404).json({ message: 'Item not found' });

    item.updatedAt = Date.now();
    await item.save();

    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🔴 Delete inventory item
export const deleteInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Inventory.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Item not found' });

    res.json({ message: 'Inventory item deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ⚠️ Low stock items
export const getLowStockItems = async (req, res) => {
  try {
    const lowStock = await Inventory.find({
      $expr: { $lte: ['$quantity', '$lowStockThreshold'] }
    });
    res.json(lowStock);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
