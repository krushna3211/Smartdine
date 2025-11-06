import express from 'express';
import {
  getOrders,
  createOrder,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
  payOrder // <-- 1. Import the new function
} from '../controllers/orderController.js';
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// --- Admin & Staff Routes ---

router.get('/', verifyToken, getOrders);
router.put('/:id/status', verifyToken, updateOrderStatus);

// --- 2. Add the new 'pay' route ---
router.put('/:id/pay', verifyToken, payOrder);
// --- End new route ---


// --- Admin-Only Routes ---

// POST /api/orders (This is the fix)
router.post('/', verifyToken, createOrder);

// PUT /api/orders/:id (Only admins can edit the full order)
// We rename the controller to 'updateOrder' for clarity
router.put('/:id', verifyToken, isAdmin, updateOrder); 

// DELETE /api/orders/:id (Only admins can delete)
router.delete('/:id', verifyToken, isAdmin, deleteOrder);

export default router;