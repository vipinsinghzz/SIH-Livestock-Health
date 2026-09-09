const express = require('express');
const router = express.Router();
const { VeterinaryCase } = require('./models');
const { Animal } = require('../animals/models');
const { requireAuth, requireRole } = require('../auth/middleware');

router.use(requireAuth);

router.get('/', requireRole(['VETERINARIAN', 'ADMIN']), async (req, res, next) => {
  try {
    const cases = await VeterinaryCase.findAll({
      include: [{ model: Animal, as: 'animal' }],
      order: [['createdAt', 'DESC']]
    });
    res.json(cases);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', requireRole(['VETERINARIAN', 'ADMIN']), async (req, res, next) => {
  try {
    const { status, vet_notes, next_action } = req.body;
    const vetCase = await VeterinaryCase.findByPk(req.params.id);
    if (!vetCase) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Case not found' }});
    }
    
    await vetCase.update({ status, vet_notes, next_action });
    res.json(vetCase);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
