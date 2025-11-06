import express from 'express';
import {
  getMenu,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem
} from '../controllers/menuController.js';
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// 🟢 Everyone (admin + staff) can view menu
router.get('/', verifyToken, getMenu);

// 🟠 Admin-only operations
router.post('/', verifyToken, isAdmin, addMenuItem);
router.put('/:id', verifyToken, isAdmin, updateMenuItem);
router.delete('/:id', verifyToken, isAdmin, deleteMenuItem);

export default router;
