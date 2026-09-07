const express = require('express');
const router = express.Router();
const { getAdvisories, createAdvisory } = require('../controllers/advisoryController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getAdvisories)
  .post(authorize('officer', 'admin'), createAdvisory);

module.exports = router;
