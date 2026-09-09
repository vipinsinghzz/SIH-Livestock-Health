const express = require('express');
const router = express.Router();
const weatherService = require('../services/weatherService');

// GET /api/weather
// Query params: lat, lng, district, state
router.get('/', async (req, res) => {
  try {
    const { lat, lng, district, state } = req.query;
    const data = await weatherService.getLiveWeather({
      lat: lat ? parseFloat(lat) : 0,
      lng: lng ? parseFloat(lng) : 0,
      district: district || 'Nagpur',
      state: state || 'Maharashtra'
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
