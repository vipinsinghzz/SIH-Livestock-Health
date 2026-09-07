const express = require('express');
const router = express.Router();
const {
  createLabReferral,
  updateLabReferral,
  getLabReferrals
} = require('../controllers/labController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getLabReferrals)
  .post(authorize('field_worker', 'officer', 'admin'), createLabReferral);

router.route('/:id')
  .patch(authorize('field_worker', 'officer', 'admin'), updateLabReferral);

module.exports = router;
