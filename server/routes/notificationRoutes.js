const express = require('express');
const router = express.Router();
const { getNotifications, markRead, markAllRead } = require('../controllers/notificationController');
const { verifyAccessToken } = require('../middleware/authMiddleware');

router.use(verifyAccessToken);

router.get('/', getNotifications);
router.post('/read-all', markAllRead);
router.post('/:id/read', markRead);

module.exports = router;
