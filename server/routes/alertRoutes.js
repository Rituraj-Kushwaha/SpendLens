const express = require('express');
const router = express.Router();
const { getAlerts, markAlertRead, markAllRead, dismissAlert } = require('../controllers/alertController');
const { verifyAccessToken } = require('../middleware/authMiddleware');

// All alert routes are protected
router.use(verifyAccessToken);

router.get('/', getAlerts);
router.patch('/read-all', markAllRead);
router.patch('/:id/read', markAlertRead);
router.delete('/:id', dismissAlert);

module.exports = router;
