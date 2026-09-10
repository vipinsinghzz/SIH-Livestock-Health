const express = require('express');
const router = express.Router();
const {
  getNearbyVeterinarians,
  getVeterinarianById,
  getDistrictsWithVets
} = require('../controllers/veterinaryController');
const { optionalProtect } = require('../middleware/auth');

// Optional authentication populates req.user (for registered district fallback) if token is present
router.use(optionalProtect);

// GET /api/veterinarians/nearby - Get nearest veterinarians via GPS / Haversine or district fallback
router.get('/nearby', getNearbyVeterinarians);

// GET /api/veterinarians/districts - Get list of Maharashtra districts with active vet counts
router.get('/districts', getDistrictsWithVets);

// GET /api/veterinarians/:id - Get specific veterinarian details
router.get('/:id', getVeterinarianById);

module.exports = router;
