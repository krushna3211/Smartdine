import express from 'express';
import { register, login } from '../controllers/authController.js';
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

//  Only admins can register users
router.post('/register', verifyToken, isAdmin, register);

//  Login (public)
router.post('/login', login);

export default router;
