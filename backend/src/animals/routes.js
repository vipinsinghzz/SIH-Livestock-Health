const express = require('express');
const router = express.Router();
const { Animal } = require('./models');
const { requireAuth } = require('../auth/middleware');

router.use(requireAuth);

// Get animals (scoped by role)
router.get('/', async (req, res, next) => {
  try {
    let whereClause = {};
    if (req.user.role === 'FARMER') {
      whereClause.owner_id = req.user.userId;
    }
    // Vets/Admins might see all or based on region (simplified for MVP)
    const animals = await Animal.findAll({ where: whereClause });
    res.json(animals);
  } catch (error) {
    next(error);
  }
});

// Create animal
router.post('/', async (req, res, next) => {
  try {
    if (req.user.role !== 'FARMER') {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only farmers can register animals.' }});
    }
    const { name, tag_id, species, breed, age, sex, weight } = req.body;
    
    const animal = await Animal.create({
      name, tag_id, species, breed, age, sex, weight, owner_id: req.user.userId
    });
    res.status(201).json(animal);
  } catch (error) {
    next(error);
  }
});

// Get animal by ID
router.get('/:id', async (req, res, next) => {
  try {
    const animal = await Animal.findByPk(req.params.id);
    if (!animal) {
      return res.status(404).json({ error: { code: 'ANIMAL_NOT_FOUND', message: 'Animal not found.' }});
    }
    // Access control
    if (req.user.role === 'FARMER' && animal.owner_id !== req.user.userId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied.' }});
    }
    res.json(animal);
  } catch (error) {
    next(error);
  }
});

// Update animal
router.put('/:id', async (req, res, next) => {
  try {
    const animal = await Animal.findByPk(req.params.id);
    if (!animal) {
      return res.status(404).json({ error: { code: 'ANIMAL_NOT_FOUND', message: 'Animal not found.' }});
    }
    if (req.user.role === 'FARMER' && animal.owner_id !== req.user.userId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied.' }});
    }
    // Limit updates
    const { name, tag_id, species, breed, age, sex, weight } = req.body;
    await animal.update({ name, tag_id, species, breed, age, sex, weight });
    res.json(animal);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
