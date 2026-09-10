const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
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
const fs = require('fs');

// Auto-spawn Python Deep Learning AI Service (lsd_model.keras)
let aiServiceProcess = null;
function startPythonAiService() {
  const pythonScript = path.join(__dirname, 'services', 'ai_service.py');
  
  let pythonExec = process.env.PYTHON_PATH || 'python';
  if (pythonExec === 'python') {
    const localVenv = path.join(__dirname, '.venv', 'Scripts', 'python.exe');
    if (fs.existsSync(localVenv)) {
      pythonExec = localVenv;
    }
  }

  console.log(`[AI Engine] Spawning Python AI Service: ${pythonExec} ${pythonScript}...`);
  
  try {
    aiServiceProcess = spawn(pythonExec, [pythonScript], {
      cwd: __dirname,
      env: { ...process.env, KERAS_BACKEND: process.env.KERAS_BACKEND || 'tensorflow' },
      stdio: ['ignore', 'inherit', 'inherit']
    });

    aiServiceProcess.on('error', (err) => {
      console.error('[AI Engine] Warning: Could not auto-spawn Python AI service:', err.message);
    });

    aiServiceProcess.on('exit', (code, signal) => {
      if (code !== 0 && code !== null) {
        console.log(`[AI Engine] Python AI service exited with code ${code}.`);
      }
    });
  } catch (err) {
    console.error('[AI Engine] Error launching Python AI service:', err.message);
  }
}

// Clean up child process and server on exit
const cleanupProcess = () => {
  if (aiServiceProcess) {
    try {
      aiServiceProcess.kill('SIGTERM');
    } catch (e) {}
  }
  if (typeof server !== 'undefined' && server && server.close) {
    try {
      server.close();
    } catch (e) {}
  }
};
process.on('SIGINT', () => { cleanupProcess(); process.exit(0); });
process.on('SIGTERM', () => { cleanupProcess(); process.exit(0); });

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
app.use('/api/kisan-saathi', require('./routes/kisanSaathiRoutes'));
app.use('/api/cases', require('./routes/caseRoutes'));
app.use('/api/veterinarians', require('./routes/veterinaryRoutes'));

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
