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

const { spawn } = require('child_process');
const path = require('path');

// Auto-spawn Python Deep Learning AI Service (lsd_model.keras)
let aiServiceProcess = null;
function startPythonAiService() {
  const pythonScript = path.join(__dirname, 'services', 'ai_service.py');
  console.log(`[AI Engine] Spawning Python AI Service: python ${pythonScript}...`);
  
  aiServiceProcess = spawn('python', [pythonScript], {
    cwd: __dirname,
    env: { ...process.env, KERAS_BACKEND: 'torch' },
    stdio: 'inherit'
  });

  aiServiceProcess.on('error', (err) => {
    console.error('[AI Engine] Warning: Could not auto-spawn Python AI service:', err.message);
  });

  aiServiceProcess.on('exit', (code, signal) => {
    if (code !== 0 && code !== null) {
      console.log(`[AI Engine] Python AI service exited with code ${code}.`);
    }
  });
}

// Clean up child process on exit
const cleanupAiProcess = () => {
  if (aiServiceProcess) {
    try {
      aiServiceProcess.kill('SIGTERM');
    } catch (e) {}
  }
};
process.on('SIGINT', () => { cleanupAiProcess(); process.exit(); });
process.on('SIGTERM', () => { cleanupAiProcess(); process.exit(); });

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'Livestock Saathi Surveillance API',
    aiModel: 'lsd_model.keras (EfficientNetB0)',
    timestamp: new Date().toISOString()
  });
});

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/animals', require('./routes/animalRoutes'));
app.use('/api/lab-referrals', require('./routes/labRoutes'));
app.use('/api/advisories', require('./routes/advisoryRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/ivr', require('./routes/ivrRoutes'));
app.use('/api/vaccination-drives', require('./routes/vaccinationRoutes'));
app.use('/api/weather', require('./routes/weatherRoutes'));
app.use('/api/nadres', require('./routes/nadresRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));

// Centralized error handling
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Livestock Saathi API Server running on port ${PORT}`);
  console.log(`🤖 AI Engine: lsd_model.keras (EfficientNetB0 + PyTorch Backend)`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
  console.log(`=======================================================`);

  // Start Python AI microservice
  startPythonAiService();
});

module.exports = app;
