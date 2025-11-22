import express from 'express';
import { generateBill, getBillHistory } from '../controllers/billController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/bills/generate -> Creates a new bill
router.post('/generate', verifyToken, generateBill);

// GET /api/bills -> Gets history
router.get('/', verifyToken, getBillHistory);

export default router;