import express from 'express';
import { getStaff, addStaff, updateStaff, deleteStaff } from '../controllers/staffController.js';
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// All staff routes require admin access
router.get('/', verifyToken, isAdmin, getStaff);
// router.post('/', verifyToken, isAdmin, addStaff); // <-- Removed
router.put('/:id', verifyToken, isAdmin, updateStaff);
router.delete('/:id', verifyToken, isAdmin, deleteStaff);

export default router;
