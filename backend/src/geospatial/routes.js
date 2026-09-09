const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../auth/middleware');

router.use(requireAuth);

// Mock data aggregation
router.get('/farms/:farm_id/dashboard', async (req, res, next) => {
  try {
    // In reality, this queries across Vaccination, Prediction, and VeterinaryCase models
    res.json({
      animals_covered: 1248,
      open_cases_high_priority: 12,
      vaccinations_due: 45,
      active_clusters: 2
    });
  } catch (error) {
    next(error);
  }
});

router.get('/risk-map', requireRole(['VETERINARIAN', 'ADMIN']), async (req, res, next) => {
  try {
    res.json([
      { id: 1, lat: 28.6139, lng: 77.2090, risk_level: 'HIGH', case_count: 5 },
      { id: 2, lat: 19.0760, lng: 72.8777, risk_level: 'CRITICAL', case_count: 12 }
    ]);
  } catch (error) {
    next(error);
  }
});

router.get('/veterinary-services/nearby', async (req, res, next) => {
  try {
    res.json([
      { id: 1, name: 'City Vet Clinic', distance: '2.5 km', phone: '+1234567890' },
      { id: 2, name: 'Rural Animal Hospital', distance: '12 km', phone: '+0987654321' }
    ]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
