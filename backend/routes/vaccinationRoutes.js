const express = require('express');
const router = express.Router();
const {
  getVaccinationDrives,
  createVaccinationDrive,
  updateVaccinationDrive
} = require('../controllers/vaccinationController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getVaccinationDrives)
  .post(authorize('officer', 'admin'), createVaccinationDrive);

router.route('/:id')
  .patch(authorize('field_worker', 'officer', 'admin'), updateVaccinationDrive);

module.exports = router;
