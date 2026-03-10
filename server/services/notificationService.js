const { query } = require('../config/db');

const createNotification = async (userId, scheduleId, message) => {
    const res = await query(
        `INSERT INTO notifications (user_id, schedule_id, message) VALUES ($1, $2, $3) RETURNING *`,
        [userId, scheduleId || null, message]
    );
    return res.rows[0];
};

/**
 * Get last 20 notifications for a user + unread count.
 */
const getNotifications = async (userId) => {
    const [notifRes, countRes] = await Promise.all([
        query(
            `SELECT n.*, s.due_date,
                    (SELECT b.title FROM bills b JOIN bill_schedules ss ON ss.bill_id = b.bill_id
                     WHERE ss.schedule_id = n.schedule_id LIMIT 1) as bill_title
             FROM notifications n
             LEFT JOIN bill_schedules s ON s.schedule_id = n.schedule_id
             WHERE n.user_id = $1
             ORDER BY n.created_at DESC LIMIT 20`,
            [userId]
        ),
        query(`SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE`, [userId]),
    ]);
    return {
        notifications: notifRes.rows,
        unreadCount: parseInt(countRes.rows[0].count, 10),
    };
};

const markRead = async (notificationId, userId) => {
    await query(
        `UPDATE notifications SET is_read = TRUE WHERE notification_id = $1 AND user_id = $2`,
        [notificationId, userId]
    );
};

const markAllRead = async (userId) => {
    await query(`UPDATE notifications SET is_read = TRUE WHERE user_id = $1`, [userId]);
};

module.exports = { createNotification, getNotifications, markRead, markAllRead };
