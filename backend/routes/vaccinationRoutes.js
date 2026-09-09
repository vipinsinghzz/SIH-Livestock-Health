const express = require('express');
const router = express.Router();
const {
  getVaccinationDrives,
  createVaccinationDrive,
  updateVaccinationDrive,
  registerForCamp
} = require('../controllers/vaccinationController');
const { protect, optionalProtect, authorize } = require('../middleware/auth');

// Public / Farmer & Officer Camp Discovery
router.get('/', optionalProtect, getVaccinationDrives);
router.post('/', protect, authorize('officer', 'admin'), createVaccinationDrive);

// Livestock Camp Registration (Farmers & Field Workers)
router.post('/:id/register', optionalProtect, registerForCamp);

// Progress & Status Updates (Authorized Officers & Field Workers)
router.patch('/:id', protect, authorize('field_worker', 'officer', 'admin'), updateVaccinationDrive);

module.exports = router;

