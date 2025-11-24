import express from 'express';
import {
  getTables,
  addTable,
  updateTable, // This will be for the full admin edit
  updateTableStatus, // We will create this new controller
  deleteTable
} from '../controllers/tableController.js';
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// --- Admin & Staff Routes ---

// GET /api/tables (Everyone can see tables)
router.get('/', verifyToken, getTables);

// PUT /api/tables/:id/status (Staff can ONLY change status)
// This is our new, staff-safe route.
router.put('/:id/status', verifyToken, updateTableStatus);


// --- Admin-Only Routes ---

// POST /api/tables (Only admins can add tables)
router.post('/', verifyToken, isAdmin, addTable);

// PUT /api/tables/:id (Only admins can edit the full table details)
router.put('/:id', verifyToken, isAdmin, updateTable);

// DELETE /api/tables/:id (Only admins can delete)
router.delete('/:id', verifyToken, isAdmin, deleteTable);

export default router;