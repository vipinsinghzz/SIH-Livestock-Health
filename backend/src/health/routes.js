const express = require('express');
const router = express.Router();
const { HealthRecord } = require('./models');
const { requireAuth } = require('../auth/middleware');

router.use(requireAuth);

router.post('/:id/symptoms', async (req, res, next) => {
  try {
    const { symptoms, duration, temperature, notes } = req.body;
    const record = await HealthRecord.create({
      animal_id: req.params.id,
      symptoms,
      temperature,
      notes,
      type: 'SYMPTOM_LOG'
    });
    res.status(201).json(record);
  } catch (error) {
    next(error);
  }
});

// Mock Image Upload
router.post('/:id/images', async (req, res, next) => {
  try {
    // In a real app, use multer and S3. For MVP mock:
    res.status(201).json({
      image_id: `img_${Date.now()}`,
      url: `https://storage.example.com/images/${req.params.id}_${Date.now()}.jpg`
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/health-history', async (req, res, next) => {
  try {
    const history = await HealthRecord.findAll({
      where: { animal_id: req.params.id },
      order: [['createdAt', 'DESC']]
    });
    res.json(history);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
