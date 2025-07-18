// server/scripts/createAdminUser.js
const mongoose = require('mongoose');
const User = require('../models/User');
const { connectDB } = require('../config/database');
const { logger } = require('../utils/logger');


// Set strictQuery to suppress the deprecation warning
mongoose.set('strictQuery', false);

const createAdminUser = async () => {
  try {
    await connectDB();
    
    // Check if admin already exists
    const adminExists = await User.findOne({ username: 'admin' });
    
    if (adminExists) {
      logger.info('Admin user already exists');
      process.exit(0);
    }
    
    // Create admin user
    const admin = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: 'secureAdminPassword', // Will be hashed by pre-save hook
      role: 'admin'
    });
    
    logger.info(`Admin user created: ${admin.username}`);
    process.exit(0);
  } catch (err) {
    logger.error(`Error creating admin user: ${err.message}`);
    process.exit(1);
  }
};

createAdminUser();