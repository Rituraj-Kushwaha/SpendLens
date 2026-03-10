const { query, connect, pool } = require('../config/db');

// ─── Schedule generation helper ───────────────────────────────────────────

/**
 * Generate all bill_schedules rows for a newly created (or edited) bill.
 * @param {object} bill  - row from bills table
 * @param {object} client - optional pg client for transactions
 */
const generateSchedules = async (bill, client = null) => {
    const db = client || { query: (t, p) => query(t, p) };

    const {
        bill_id, user_id, bill_date, due_date,
        frequency, interval_days, tenure,
    } = bill;

    const dates = [];
    const start = new Date(bill_date);

    if (frequency === 'one-time') {
        dates.push(new Date(start));
    } else {
        // Determine how many occurrences to generate upfront
        let count;
        if (frequency === 'monthly') {
            count = tenure != null ? tenure : 24; // 24-month look-ahead for infinite
        } else if (frequency === 'quarterly') {
            count = tenure != null ? tenure * 4 : 24;
        } else if (frequency === 'yearly') {
            count = tenure != null ? tenure : 5;
        } else if (frequency === 'weekly') {
            count = tenure != null ? tenure : 52;
        } else if (frequency === 'custom') {
            count = tenure != null ? tenure : 24;
        } else {
            count = 1;
        }

        const current = new Date(start);
        for (let i = 0; i < count; i++) {
            dates.push(new Date(current));
            // Advance
            if (frequency === 'weekly') {
                current.setDate(current.getDate() + 7);
            } else if (frequency === 'monthly') {
                current.setMonth(current.getMonth() + 1);
            } else if (frequency === 'quarterly') {
                current.setMonth(current.getMonth() + 3);
            } else if (frequency === 'yearly') {
                current.setFullYear(current.getFullYear() + 1);
            } else if (frequency === 'custom') {
                current.setDate(current.getDate() + (interval_days || 1));
            }
        }
    }

    // Insert all schedule rows
    for (const d of dates) {
        await db.query(
            `INSERT INTO bill_schedules (bill_id, user_id, due_date) VALUES ($1, $2, $3)`,
            [bill_id, user_id, d.toISOString().slice(0, 10)]
        );
    }

    return dates.length;
};

/**
 * Delete all pending future schedules from today onward for a bill.
 * Used when editing or deleting a bill.
 */
const deleteFutureSchedules = async (billId) => {
    const res = await query(
        `DELETE FROM bill_schedules
         WHERE bill_id = $1 AND status = 'pending' AND due_date >= CURRENT_DATE
         RETURNING schedule_id`,
        [billId]
    );
    return res.rowCount;
};

/**
 * Skip (soft-delete) a single schedule occurrence.
 */
const skipSchedule = async (scheduleId, userId) => {
    const res = await query(
        `UPDATE bill_schedules SET status = 'skipped'
         WHERE schedule_id = $1 AND user_id = $2
         RETURNING *`,
        [scheduleId, userId]
    );
    return res.rows[0];
};

/**
 * Get all pending + overdue schedules for a user (upcoming & overdue dashboard).
 */
const getPendingSchedules = async (userId) => {
    const res = await query(
        `SELECT s.*, b.title, b.amount, b.frequency, b.notes,
                c.category_name as category
         FROM bill_schedules s
         JOIN bills b ON b.bill_id = s.bill_id AND b.is_deleted = FALSE
         LEFT JOIN categories c ON c.category_id = b.category_id
         WHERE s.user_id = $1 AND s.status IN ('pending','overdue')
         ORDER BY s.due_date ASC`,
        [userId]
    );
    return res.rows;
};

/**
 * Get all paid schedules for a user in the current month.
 */
const getPaidThisMonth = async (userId) => {
    const res = await query(
        `SELECT s.schedule_id, s.due_date, s.status,
                b.title, b.amount, b.frequency,
                c.category_name as category,
                t.amount as paid_amount, t.payment_method, t.payment_reference, t.paid_date
         FROM bill_schedules s
         JOIN bills b ON b.bill_id = s.bill_id
         LEFT JOIN categories c ON c.category_id = b.category_id
         JOIN transactions t ON t.schedule_id = s.schedule_id
         WHERE s.user_id = $1
           AND s.status = 'paid'
           AND date_trunc('month', t.paid_date) = date_trunc('month', NOW())
         ORDER BY t.paid_date DESC`,
        [userId]
    );
    return res.rows;
};

/**
 * Get schedules due within the next N days.
 */
const getUpcomingSchedules = async (userId, days = 7) => {
    const res = await query(
        `SELECT s.*, b.title, b.amount, b.frequency,
                c.category_name as category
         FROM bill_schedules s
         JOIN bills b ON b.bill_id = s.bill_id AND b.is_deleted = FALSE
         LEFT JOIN categories c ON c.category_id = b.category_id
         WHERE s.user_id = $1
           AND s.status = 'pending'
           AND s.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${days} days'
         ORDER BY s.due_date ASC`,
        [userId]
    );
    return res.rows;
};

/**
 * Mark all pending past-due schedules as overdue. Called by cron job.
 */
const markOverdueSchedules = async () => {
    const res = await query(
        `UPDATE bill_schedules SET status = 'overdue'
         WHERE status = 'pending' AND due_date < CURRENT_DATE
         RETURNING schedule_id, user_id, bill_id`
    );
    return res.rows;
};

/**
 * Find the next pending schedule for a bill after a given date.
 */
const getNextSchedule = async (billId, afterDate) => {
    const res = await query(
        `SELECT * FROM bill_schedules
         WHERE bill_id = $1 AND due_date > $2 AND status = 'pending'
         ORDER BY due_date ASC LIMIT 1`,
        [billId, afterDate]
    );
    return res.rows[0] || null;
};

/**
 * Count pending schedules remaining for a bill.
 */
const countPendingForBill = async (billId) => {
    const res = await query(
        `SELECT COUNT(*) FROM bill_schedules WHERE bill_id = $1 AND status = 'pending'`,
        [billId]
    );
    return parseInt(res.rows[0].count, 10);
};

module.exports = {
    generateSchedules, deleteFutureSchedules, skipSchedule,
    getPendingSchedules, getPaidThisMonth, getUpcomingSchedules,
    markOverdueSchedules, getNextSchedule, countPendingForBill,
};
