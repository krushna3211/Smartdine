import express from 'express';
import { getSalesReport } from '../controllers/reportController.js';
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/reports?period=daily (or weekly, monthly)
router.get('/', verifyToken, isAdmin, getSalesReport);

export default router;