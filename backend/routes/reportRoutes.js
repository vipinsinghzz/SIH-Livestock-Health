const express = require('express');
const router = express.Router();
const {
  createReport,
  getReports,
  getReportById,
  updateReportStatus
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .post(createReport)
  .get(getReports);

router.route('/:id')
  .get(getReportById);

router.route('/:id/status')
  .patch(authorize('field_worker', 'officer', 'admin'), updateReportStatus);

module.exports = router;
