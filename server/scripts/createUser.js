// server/scripts/createUser.js
const mongoose = require('mongoose');
const User = require('../models/User');
const { connectDB } = require('../config/database');
const { logger } = require('../utils/logger');

// Set strictQuery to suppress the deprecation warning
mongoose.set('strictQuery', false);

const createUser = async () => {
  try {
    await connectDB();
    
    // Get command line arguments
    const args = process.argv.slice(2);
    
    if (args.length < 3) {
      logger.info('Usage: node createUser.js <username> <email> <password> [role]');
      logger.info('Roles: admin, operator, viewer (default: viewer)');
      logger.info('Example: node createUser.js testuser test@example.com mypassword admin');
      process.exit(1);
    }
    
    const [username, email, password, role = 'viewer'] = args;
    
    // Validate role
    const validRoles = ['admin', 'operator', 'viewer'];
    if (!validRoles.includes(role)) {
      logger.error(`Invalid role: ${role}. Valid roles are: ${validRoles.join(', ')}`);
      process.exit(1);
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ username }, { email }] 
    });
    
    if (existingUser) {
      logger.error(`User already exists with username: ${existingUser.username} or email: ${existingUser.email}`);
      process.exit(1);
    }
    
    // Create new user
    const newUser = await User.create({
      username,
      email,
      password,
      role
    });
    
    logger.info(`User created successfully:`);
    logger.info(`- Username: ${newUser.username}`);
    logger.info(`- Email: ${newUser.email}`);
    logger.info(`- Role: ${newUser.role}`);
    logger.info(`- ID: ${newUser._id}`);
    
    // List all users for verification
    const users = await User.find({}, 'username email role createdAt');
    logger.info('\nAll users in database:');
    users.forEach(user => {
      logger.info(`- ${user.username} (${user.email}) - Role: ${user.role} - Created: ${user.createdAt.toISOString()}`);
    });
    
    process.exit(0);
  } catch (err) {
    logger.error(`Error creating user: ${err.message}`);
    process.exit(1);
  }
};

createUser();