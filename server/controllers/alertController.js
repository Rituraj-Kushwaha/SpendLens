const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { query } = require('../config/db');

const deriveAlertType = (message = '') => {
    const m = message.toLowerCase();
    if (m.includes('overdue')) return 'overspending';
    if (m.includes('due') || m.includes('reminder')) return 'upcoming';
    if (m.includes('duplicate')) return 'duplicate';
    if (m.includes('save') || m.includes('savings')) return 'savings';
    return 'info';
};

// GET /api/alerts
const getAlerts = catchAsync(async (req, res) => {
    const resRows = await query(
        `SELECT notification_id, schedule_id, message, is_read, created_at
         FROM notifications
         WHERE user_id = $1
         ORDER BY is_read ASC, created_at DESC`,
        [req.user.userId]
    );

    const alerts = resRows.rows.map((r) => ({
        _id: r.notification_id,
        billId: r.schedule_id,
        message: r.message,
        isRead: r.is_read,
        createdAt: r.created_at,
        type: deriveAlertType(r.message),
    }));

    const unreadCount = alerts.filter((a) => !a.isRead).length;

    res.status(200).json({
        success: true,
        data: { alerts, unreadCount },
        error: null,
    });
});

// PATCH /api/alerts/:id/read
const markAlertRead = catchAsync(async (req, res, next) => {
    const updated = await query(
        `UPDATE notifications
         SET is_read = TRUE
         WHERE notification_id = $1 AND user_id = $2
         RETURNING notification_id, schedule_id, message, is_read, created_at`,
        [req.params.id, req.user.userId]
    );

    if (!updated.rows[0]) return next(new AppError('Alert not found', 404));

    const r = updated.rows[0];
    res.status(200).json({
        success: true,
        data: {
            alert: {
                _id: r.notification_id,
                billId: r.schedule_id,
                message: r.message,
                isRead: r.is_read,
                createdAt: r.created_at,
                type: deriveAlertType(r.message),
            },
        },
        error: null,
    });
});

// PATCH /api/alerts/read-all
const markAllRead = catchAsync(async (req, res) => {
    await query(`UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`, [req.user.userId]);
    res.status(200).json({ success: true, data: null, error: null });
});

// DELETE /api/alerts/:id
const dismissAlert = catchAsync(async (req, res, next) => {
    const deleted = await query(
        `DELETE FROM notifications WHERE notification_id = $1 AND user_id = $2 RETURNING notification_id`,
        [req.params.id, req.user.userId]
    );
    if (!deleted.rows[0]) return next(new AppError('Alert not found', 404));
    res.status(200).json({ success: true, data: null, error: null });
});

module.exports = { getAlerts, markAlertRead, markAllRead, dismissAlert };
