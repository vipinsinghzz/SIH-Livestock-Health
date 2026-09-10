const express = require('express');
const router = express.Router();
const {
  getVaccinationDrives,
  createVaccinationDrive,
  updateVaccinationDrive,
  registerForCamp,
  getMyRegistrations
} = require('../controllers/vaccinationController');
const { protect, optionalProtect, authorize } = require('../middleware/auth');

// Public / Farmer & Officer Camp Discovery
router.get('/', optionalProtect, getVaccinationDrives);
router.get('/my-registrations', protect, getMyRegistrations);
router.post('/', protect, authorize('field_worker', 'veterinarian', 'officer', 'admin'), createVaccinationDrive);

// Livestock Camp Registration (Farmers & Field Workers)
router.post('/:id/register', optionalProtect, registerForCamp);

// Progress & Status Updates (Authorized Officers & Field Workers)
router.patch('/:id', protect, authorize('field_worker', 'officer', 'admin'), updateVaccinationDrive);

module.exports = router;

