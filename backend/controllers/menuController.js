import MenuItem from '../models/MenuItem.js';

// 🟢 Get all menu items (This was perfect)
export const getMenu = async (req, res) => {
  try {
    const menu = await MenuItem.find();
    res.json(menu);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🟢 Add a new menu item (FIXED)
export const addMenuItem = async (req, res) => {
  try {
    // 1. Get 'image' from req.body
    const { name, category, price, available, image } = req.body;
    // 2. Add 'image' to the create call
    const item = await MenuItem.create({ name, category, price, available, image });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🟡 Update a menu item (FIXED)
export const updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    // 1. Get 'image' from req.body
    const { name, category, price, available, image } = req.body;

    const updated = await MenuItem.findByIdAndUpdate(
      id,
      // 2. Add 'image' to the update call
      { name, category, price, available, image },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: 'Menu item not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🔴 Delete a menu item (This was perfect)
export const deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await MenuItem.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Menu item not found' });

    res.json({ message: 'Menu item deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};