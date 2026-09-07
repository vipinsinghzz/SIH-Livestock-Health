const express = require('express');
const router = express.Router();
const {
  getAnimals,
  getAnimalById,
  createAnimal,
  updateAnimal
} = require('../controllers/animalController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getAnimals)
  .post(createAnimal);

router.route('/:id')
  .get(getAnimalById)
  .patch(updateAnimal);

module.exports = router;
