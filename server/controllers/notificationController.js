const catchAsync = require('../utils/catchAsync');
const notificationService = require('../services/notificationService');

// GET /api/notifications
const getNotifications = catchAsync(async (req, res) => {
    const data = await notificationService.getNotifications(req.user.userId);
    res.status(200).json({ success: true, data, error: null });
});

// POST /api/notifications/:id/read
const markRead = catchAsync(async (req, res) => {
    await notificationService.markRead(req.params.id, req.user.userId);
    res.status(200).json({ success: true, data: null, error: null });
});

// POST /api/notifications/read-all
const markAllRead = catchAsync(async (req, res) => {
    await notificationService.markAllRead(req.user.userId);
    res.status(200).json({ success: true, data: null, error: null });
});

module.exports = { getNotifications, markRead, markAllRead };
