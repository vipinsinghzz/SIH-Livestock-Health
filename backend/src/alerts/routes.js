const express = require('express');
const router = express.Router();
const { Alert } = require('./models');
const { requireAuth } = require('../auth/middleware');

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const alerts = await Alert.findAll({
      where: { user_id: req.user.userId },
      order: [['createdAt', 'DESC']]
    });
    res.json(alerts);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/read', async (req, res, next) => {
  try {
    const alert = await Alert.findOne({ where: { id: req.params.id, user_id: req.user.userId } });
    if (!alert) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Alert not found' }});
    
    await alert.update({ is_read: true });
    res.json(alert);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
