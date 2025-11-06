import express from 'express';
import {
  getInventory,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getLowStockItems
} from '../controllers/inventoryController.js';
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// 🟢 Admin only
router.get('/', verifyToken, isAdmin, getInventory);
router.post('/', verifyToken, isAdmin, addInventoryItem);
router.put('/:id', verifyToken, isAdmin, updateInventoryItem);
router.delete('/:id', verifyToken, isAdmin, deleteInventoryItem);
router.get('/low-stock', verifyToken, isAdmin, getLowStockItems);

export default router;
