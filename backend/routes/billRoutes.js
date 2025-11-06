import express from 'express';
import {
  generateBill,
  getAllBills,
  getBillById,
  deleteBill
} from '../controllers/billController.js';
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// 🧾 Generate bill (Admin + Staff)
router.post('/', verifyToken, generateBill);

// 📋 Get all bills (Admin only)
router.get('/', verifyToken, isAdmin, getAllBills);

// 📄 Get single bill (Admin + Staff)
router.get('/:id', verifyToken, getBillById);

// 🗑️ Delete bill (Admin only)
router.delete('/:id', verifyToken, isAdmin, deleteBill);

export default router;
