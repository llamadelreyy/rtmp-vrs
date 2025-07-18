// server/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');
const passport = require('passport');

const { corsOptions } = require('./config/cors');
const { connectDB } = require('./config/database');
const { configureJWT } = require('./config/auth');
const { logger } = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const streamRoutes = require('./routes/streams');
const visionRoutes = require('./routes/vision');
const promptRoutes = require('./routes/prompts');

// Initialize Express app
const app = express();

// Connect to database
connectDB();

// Middleware
app.use(helmet()); // Security headers
app.use(cors(corsOptions)); // CORS
app.use(express.json()); // JSON body parser
app.use(express.urlencoded({ extended: true })); // URL encoded parser
app.use(cookieParser()); // Cookie parser
app.use(morgan('dev', { stream: { write: message => logger.info(message.trim()) } })); // HTTP request logging

// Configure passport for JWT authentication
configureJWT(passport);
app.use(passport.initialize());

console.log('Registering API routes...');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/streams', streamRoutes);
app.use('/api/prompts', promptRoutes);

console.log('Registering Vision API routes...', Object.keys(visionRoutes));

app.use('/api/vision', visionRoutes);
// Add a test route at the app level
app.get('/api-test', (req, res) => {
  res.json({ message: 'API is working' });
});

app.use('/api/captures', (req, res, next) => {
  // Set CORS headers specifically for the static files
  res.setHeader('Access-Control-Allow-Origin', '*'); // Or specify your frontend origin
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'public/captures')));
// Make sure the routes are valid before using them
console.log('Loaded vision routes:', !!visionRoutes);

// If in production, serve static files from React build directory
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// Error handler
app.use(errorHandler);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ message: 'Route not found' });
});


module.exports = app;