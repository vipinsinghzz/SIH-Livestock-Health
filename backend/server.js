const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Connect to MongoDB (Optional legacy store; does not block or crash if unavailable)
connectDB().catch(err => {
  console.warn('[Database Warning] MongoDB connection attempt failed:', err.message);
});

const app = express();

// Helper to resolve and normalize allowed CORS origins
function resolveAllowedOrigins() {
  const defaultLocalOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5000',
    'http://127.0.0.1:5000'
  ];

  const envOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim().replace(/\/+$/, '')).filter(Boolean)
    : [];

  if (process.env.NODE_ENV === 'production' && envOrigins.length > 0) {
    return envOrigins;
  }

  return Array.from(new Set([...envOrigins, ...defaultLocalOrigins]));
}

// Middleware: Production-safe credentialed CORS
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser / server-to-server / curl requests with no origin header
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = origin.trim().replace(/\/+$/, '');
    const allowedList = resolveAllowedOrigins();

    const isExplicitlyAllowed = allowedList.some(allowed => {
      return allowed.trim().replace(/\/+$/, '') === normalizedOrigin;
    });

    if (isExplicitlyAllowed) {
      return callback(null, true);
    }

    // In non-production environments, allow any localhost, 127.0.0.1, LAN IP, or exp:// origin
    if (process.env.NODE_ENV !== 'production') {
      if (
        /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(normalizedOrigin) ||
        normalizedOrigin.startsWith('exp://')
      ) {
        return callback(null, true);
      }
    }

    // Reject unauthorized origin
    return callback(new Error(`CORS policy rejection: Origin '${origin}' is not allowed.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'apikey']
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
  if (process.env.SPAWN_LOCAL_AI === 'false') {
    console.log(`[AI Engine] Local Python process auto-spawn disabled (SPAWN_LOCAL_AI=false). Using external AI_SERVICE_URL: ${process.env.AI_SERVICE_URL || 'http://127.0.0.1:5050'}`);
    return;
  }

  const pythonScript = path.join(__dirname, 'services', 'ai_service.py');
  
  let pythonExec = process.env.PYTHON_PATH || 'python';
  if (pythonExec === 'python') {
    const localVenvWin = path.join(__dirname, '.venv', 'Scripts', 'python.exe');
    const localVenvUnix = path.join(__dirname, '.venv', 'bin', 'python');
    if (fs.existsSync(localVenvWin)) {
      pythonExec = localVenvWin;
    } else if (fs.existsSync(localVenvUnix)) {
      pythonExec = localVenvUnix;
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

const { checkAiHealth } = require('./services/aiModelService');
const { supabase, isLiveSupabase } = require('./config/supabaseClient');

// Machine-readable health check endpoints (supporting cloud orchestrators and reverse proxies)
const healthHandler = async (req, res) => {
  let aiHealth = { online: false, status: 'unknown' };
  try {
    aiHealth = await checkAiHealth();
  } catch (e) {
    aiHealth = { online: false, error: 'Health probe failed' };
  }

  const isDbConfigured = Boolean(isLiveSupabase ? supabase : true);
  const isAiHealthy = Boolean(aiHealth.online && aiHealth.modelLoaded);

const geminiService = require('./services/geminiService');

  res.status(isDbConfigured ? 200 : 503).json({
    status: isDbConfigured ? (isAiHealthy ? 'healthy' : 'degraded') : 'unhealthy',
    service: 'PashuCare Surveillance API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      type: 'Supabase PostgreSQL',
      connected: isDbConfigured,
      mode: isLiveSupabase ? 'live' : 'resilient_mock'
    },
    aiService: {
      url: process.env.AI_SERVICE_URL || 'http://127.0.0.1:5050',
      status: aiHealth.status || (aiHealth.online ? 'healthy' : 'unavailable'),
      modelLoaded: Boolean(aiHealth.modelLoaded),
      fallbackMode: !isAiHealthy
    },
    gemini: geminiService.getStatus(),
    timestamp: new Date().toISOString()
  });
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

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
app.use('/api/notifications', require('./routes/notificationRoutes'));

// Centralized error handling
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🚀 PashuCare API Server running on port ${PORT}`);
  console.log(`🤖 AI Engine: lsd_model.keras (EfficientNetB0 + Keras 3 / TensorFlow Backend)`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`=======================================================`);

  // Start Python AI microservice
  startPythonAiService();
});

module.exports = app;
