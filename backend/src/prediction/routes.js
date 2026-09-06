const express = require('express');
const router = express.Router();
const { Prediction } = require('./models');
const { Animal } = require('../animals/models');
const { HealthRecord } = require('../health/models');
const { VeterinaryCase } = require('../veterinary/models');
const { requireAuth } = require('../auth/middleware');

router.use(requireAuth);

// Mock ML Service
const mockMLScreen = async (payload) => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Randomize a little for demonstration
  const rand = Math.random();
  if (rand > 0.8) {
    return {
      risk_level: 'CRITICAL',
      possible_conditions: [{ name: 'Foot and Mouth Disease', confidence: 0.92 }],
      reason_codes: ['RC-101', 'RC-202'], // Will be mapped to plain text
      model_version: 'v1.2.4',
      requires_veterinary_review: true
    };
  } else if (rand > 0.5) {
    return {
      risk_level: 'MEDIUM',
      possible_conditions: [{ name: 'Mild Dermatitis', confidence: 0.75 }],
      reason_codes: ['RC-303'],
      model_version: 'v1.2.4',
      requires_veterinary_review: false
    };
  } else {
    return {
      risk_level: 'LOW',
      possible_conditions: [{ name: 'Healthy', confidence: 0.98 }],
      reason_codes: [],
      model_version: 'v1.2.4',
      requires_veterinary_review: false
    };
  }
};

const mapReasonCodes = (codes) => {
  const codeMap = {
    'RC-101': 'Lesions detected on the hooves.',
    'RC-202': 'High temperature and drooling reported.',
    'RC-303': 'Minor skin irritation visible in image.',
  };
  return codes.map(c => codeMap[c] || 'Unknown reason');
};

router.post('/:id/screen', async (req, res, next) => {
  try {
    const animalId = req.params.id;
    const { symptoms, image_url } = req.body;

    if (!symptoms && !image_url) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Must provide symptoms or image_url' }});
    }

    const animal = await Animal.findByPk(animalId);
    if (!animal) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Animal not found' }});

    // Call ML Service
    const mlResponse = await mockMLScreen({ animal, symptoms, image_url });

    // Store Prediction
    const prediction = await Prediction.create({
      animal_id: animal.id,
      risk_level: mlResponse.risk_level,
      possible_conditions: mlResponse.possible_conditions,
      reasons: mapReasonCodes(mlResponse.reason_codes),
      model_version: mlResponse.model_version,
      requires_veterinary_review: mlResponse.requires_veterinary_review
    });

    // Auto-create Vet Case if required
    if (mlResponse.requires_veterinary_review || mlResponse.risk_level === 'HIGH' || mlResponse.risk_level === 'CRITICAL') {
      await VeterinaryCase.create({
        animal_id: animal.id,
        priority: mlResponse.risk_level,
        status: 'OPEN'
      });
    }

    res.status(201).json(prediction);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/predictions', async (req, res, next) => {
  try {
    const predictions = await Prediction.findAll({ where: { animal_id: req.params.id }, order: [['createdAt', 'DESC']] });
    res.json(predictions);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
