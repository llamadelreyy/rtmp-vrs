// server/config/cors.js
const { CLIENT_URL } = require('./env');

exports.corsOptions = {
  origin: [CLIENT_URL],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400,
};
