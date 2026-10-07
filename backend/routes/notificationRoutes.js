/**
 * PashuCare - Notification Routes
 * File: backend/routes/notificationRoutes.js
 * 
 * Enterprise Notification & Clinical Surveillance Endpoints
 * Protected by JWT Authentication Middleware
 */

const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllAsRead
} = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

// All notification operations require authentication
router.use(protect);

router.route('/')
  .get(getNotifications);

router.route('/:id/read')
  .patch(markAsRead);

router.route('/mark-all-read')
  .post(markAllAsRead);

module.exports = router;
