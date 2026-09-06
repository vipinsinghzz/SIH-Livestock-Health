const express = require('express');
const router = express.Router();
const { Vaccination } = require('./models');
const { requireAuth } = require('../auth/middleware');

router.use(requireAuth);

router.get('/:id/vaccinations', async (req, res, next) => {
  try {
    const vaccinations = await Vaccination.findAll({
      where: { animal_id: req.params.id },
      order: [['administered_date', 'DESC']]
    });
    res.json(vaccinations);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/vaccinations', async (req, res, next) => {
  try {
    const { vaccine_name, administered_date, next_due_date, batch_number } = req.body;
    const vaccination = await Vaccination.create({
      animal_id: req.params.id,
      vaccine_name,
      administered_date,
      next_due_date,
      batch_number,
      administered_by: req.user.userId
    });
    res.status(201).json(vaccination);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
