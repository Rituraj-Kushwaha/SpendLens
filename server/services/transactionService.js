const { query, pool } = require('../config/db');
const scheduleService = require('./scheduleService');

/**
 * Confirm payment atomically:
 * 1. Validate schedule exists and belongs to user
 * 2. Validate schedule is not already paid
 * 3. Update schedule status → paid
 * 4. Insert transaction record
 * 5. Ensure next schedule exists (for infinite recurring bills)
 */
const confirmPayment = async (scheduleId, userId, { amount, payment_method, payment_reference }) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Lock and fetch schedule
        const schedRes = await client.query(
            `SELECT s.*, b.frequency, b.tenure, b.bill_id, b.user_id as bill_user,
                    b.interval_days, b.is_deleted
             FROM bill_schedules s
             JOIN bills b ON b.bill_id = s.bill_id
             WHERE s.schedule_id = $1 AND s.user_id = $2
             FOR UPDATE`,
            [scheduleId, userId]
        );
        const schedule = schedRes.rows[0];
        if (!schedule) throw new Error('Schedule not found');

        // 2. Already paid guard
        if (schedule.status === 'paid') throw new Error('This bill has already been paid');

        // 3. Mark paid
        await client.query(
            `UPDATE bill_schedules SET status = 'paid' WHERE schedule_id = $1`,
            [scheduleId]
        );

        // 4. Insert transaction (use provided amount or bill's original amount)
        const txRes = await client.query(
            `INSERT INTO transactions (schedule_id, user_id, amount, payment_method, payment_reference)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [scheduleId, userId, amount, payment_method || null, payment_reference || null]
        );
        const transaction = txRes.rows[0];

        // 5. For infinite recurring (tenure = null, frequency != one-time): ensure next schedule exists
        if (schedule.frequency !== 'one-time' && schedule.tenure === null) {
            const nextExists = await scheduleService.getNextSchedule(schedule.bill_id, schedule.due_date);
            if (!nextExists) {
                // Generate one more occurrence
                const nextDate = new Date(schedule.due_date);
                if (schedule.frequency === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
                else if (schedule.frequency === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
                else if (schedule.frequency === 'quarterly') nextDate.setMonth(nextDate.getMonth() + 3);
                else if (schedule.frequency === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);
                else if (schedule.frequency === 'custom') nextDate.setDate(nextDate.getDate() + (schedule.interval_days || 1));

                await client.query(
                    `INSERT INTO bill_schedules (bill_id, user_id, due_date) VALUES ($1, $2, $3)`,
                    [schedule.bill_id, userId, nextDate.toISOString().slice(0, 10)]
                );
            }
        }

        await client.query('COMMIT');
        return { schedule, transaction };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

/**
 * Get all transactions for a user, with optional month / category / payment_method filters.
 */
const getTransactions = async (userId, { month, category, payment_method } = {}) => {
    let sql = `
        SELECT t.*, s.due_date, b.title, b.frequency,
               c.category_name as category
        FROM transactions t
        JOIN bill_schedules s ON s.schedule_id = t.schedule_id
        JOIN bills b ON b.bill_id = s.bill_id
        LEFT JOIN categories c ON c.category_id = b.category_id
        WHERE t.user_id = $1`;
    const params = [userId];
    let idx = 2;

    if (month) {
        sql += ` AND to_char(t.paid_date, 'YYYY-MM') = $${idx++}`;
        params.push(month);
    }
    if (category) {
        sql += ` AND c.category_name = $${idx++}`;
        params.push(category);
    }
    if (payment_method) {
        sql += ` AND t.payment_method = $${idx++}`;
        params.push(payment_method);
    }

    sql += ' ORDER BY t.paid_date DESC';
    const res = await query(sql, params);
    return res.rows;
};

module.exports = { confirmPayment, getTransactions };
