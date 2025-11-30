const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@ecommerce.com' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const admin = new User({
      email: 'admin@ecommerce.com',
      password: 'Admin123456',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin'
    });

    await admin.save();
    console.log('✓ Admin user created successfully');
    console.log('Email: admin@ecommerce.com');
    console.log('Password: Admin123456');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createAdmin();
