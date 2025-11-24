import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import Staff from './models/Staff.js'; // Check if this path matches your folder structure

dotenv.config();

// Connect to DB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('DB Connected'))
  .catch(err => console.log(err));

const createAdmin = async () => {
  try {
    // 1. Delete existing users (Optional: Be careful!)
    // await Staff.deleteMany(); 

    // 2. Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('123456', salt); // Password is "123456"

    // 3. Create the Admin
    const admin = new Staff({
      name: "System Admin",
      email: "admin@smartdine.com",
      password: hashedPassword,
      role: "admin"
    });

    await admin.save();
    console.log('✅ Admin User Created!');
    console.log('📧 Email: admin@smartdine.com');
    console.log('🔑 Password: 123456');
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

createAdmin();