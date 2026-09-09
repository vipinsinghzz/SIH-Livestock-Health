const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const authRoutes = require('./auth/routes');
const animalRoutes = require('./animals/routes');
const healthRoutes = require('./health/routes');
const predictionRoutes = require('./prediction/routes');
const veterinaryRoutes = require('./veterinary/routes');
const vaccinationRoutes = require('./vaccination/routes');
const alertsRoutes = require('./alerts/routes');
const geospatialRoutes = require('./geospatial/routes');

app.use('/auth', authRoutes);
app.use('/animals', animalRoutes);
app.use('/animals', healthRoutes); 
app.use('/animals', predictionRoutes); 
app.use('/animals', vaccinationRoutes); 
app.use('/veterinary-cases', veterinaryRoutes);
app.use('/alerts', alertsRoutes);
app.use('/', geospatialRoutes);

// Standard Error Handler per API_CONTRACT.md
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred.',
      request_id: req.headers['x-request-id'] || 'unknown_req'
    }
  });
});

module.exports = app;
