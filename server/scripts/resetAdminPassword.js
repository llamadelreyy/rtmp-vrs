// server/scripts/resetAdminPassword.js
const mongoose = require('mongoose');
const User = require('../models/User');
const { connectDB } = require('../config/database');
const { logger } = require('../utils/logger');

// Set strictQuery to suppress the deprecation warning
mongoose.set('strictQuery', false);

const resetAdminPassword = async () => {
  try {
    await connectDB();
    
    // Find the admin user
    const admin = await User.findOne({ username: 'admin' });
    
    if (!admin) {
      logger.info('Admin user not found. Creating new admin user...');
      
      // Create admin user
      const newAdmin = await User.create({
        username: 'admin',
        email: 'admin@example.com',
        password: 'secureAdminPassword',
        role: 'admin'
      });
      
      logger.info(`Admin user created: ${newAdmin.username}`);
    } else {
      logger.info('Admin user found. Resetting password...');
      
      // Reset password
      admin.password = 'secureAdminPassword';
      await admin.save();
      
      logger.info('Admin password reset successfully');
    }
    
    // List all users for verification
    const users = await User.find({}, 'username email role createdAt');
    logger.info('Current users in database:');
    users.forEach(user => {
      logger.info(`- ${user.username} (${user.email}) - Role: ${user.role}`);
    });
    
    process.exit(0);
  } catch (err) {
    logger.error(`Error resetting admin password: ${err.message}`);
    process.exit(1);
  }
};

resetAdminPassword();