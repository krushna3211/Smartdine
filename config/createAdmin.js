import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import Staff from '../models/Staff.js';
import connectDB from './db.js';

dotenv.config();

const createAdmin = async () => {
  try {
    await connectDB();

    const existingAdmin = await Staff.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('✅ Admin already exists:', existingAdmin.email);
      process.exit();
    }

    const hashedPassword = await bcrypt.hash('admin123', 10);

    const admin = await Staff.create({
      name: 'System Admin',
      email: 'admin@pos.com',
      password: hashedPassword,
      role: 'admin'
    });

    console.log('🎉 Admin created successfully!');
    console.log('Login credentials:');
    console.log('Email:', admin.email);
    console.log('Password: admin123');
    process.exit();
  } catch (err) {
    console.error('❌ Error creating admin:', err);
    process.exit(1);
  }
};

createAdmin();
