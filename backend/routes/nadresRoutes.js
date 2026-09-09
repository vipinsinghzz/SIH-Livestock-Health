const express = require('express');
const router = express.Router();
const nadresService = require('../services/nadresService');

// GET /api/nadres/forewarning
// Query params: district, state
router.get('/forewarning', async (req, res) => {
  try {
    const { district, state } = req.query;
    const forewarning = await nadresService.getDistrictForewarning(
      district || 'Nagpur',
      state || 'Maharashtra'
    );
    res.json(forewarning);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/nadres/trends
// Query params: diseaseId
router.get('/trends', async (req, res) => {
  try {
    const diseaseId = req.query.diseaseId || req.query.disease_id || 11;
    const trends = await nadresService.getHistoricalTrends(diseaseId);
    res.json(trends);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/nadres/alerts
// Query params: district, state, village, block, lat, lng
router.get('/alerts', async (req, res) => {
  try {
    const { district, state, village, block, lat, lng } = req.query;
    const data = await nadresService.getVillageAlerts({
      district: district || 'Pune',
      state: state || 'Maharashtra',
      village: village || 'Rui',
      block: block || 'Baramati',
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
