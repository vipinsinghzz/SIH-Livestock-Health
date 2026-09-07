const express = require('express');
const router = express.Router();
const { ivrWebhook } = require('../controllers/ivrController');

// Inbound Telephony webhook (Twilio / Exotel compatible)
router.post('/webhook', ivrWebhook);

module.exports = router;
