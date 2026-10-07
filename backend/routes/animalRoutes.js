const express = require('express');
const router = express.Router();
const {
  getAnimals,
  getAnimalById,
  createAnimal,
  updateAnimal,
  deleteAnimal
} = require('../controllers/animalController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getAnimals)
  .post(createAnimal);

router.route('/:id')
  .get(getAnimalById)
  .patch(updateAnimal)
  .delete(deleteAnimal);

module.exports = router;
