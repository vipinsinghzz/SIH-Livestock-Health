require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'PashuRakshak Surveillance API',
    aiModelVersion: 'mock-v0.1',
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/animals', require('./routes/animalRoutes'));
app.use('/api/lab-referrals', require('./routes/labRoutes'));
app.use('/api/advisories', require('./routes/advisoryRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/ivr', require('./routes/ivrRoutes'));
app.use('/api/vaccination-drives', require('./routes/vaccinationRoutes'));

// Centralized error handling
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 PashuRakshak API Server running on port ${PORT}`);
  console.log(`🤖 AI Engine: Mock Simulator (v0.1 - Spatiotemporal Cluster Detection Enabled)`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
  console.log(`=======================================================`);
});

module.exports = app;
