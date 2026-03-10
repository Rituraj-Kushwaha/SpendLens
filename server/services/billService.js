const { query, pool } = require('../config/db');
const scheduleService = require('./scheduleService');

/**
 * Create a bill and generate all its schedules atomically.
 */
const createBill = async (userId, data) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const {
            title, category_id, amount, bill_date, due_date,
            frequency, interval_days, tenure, notes,
        } = data;

        const res = await client.query(
            `INSERT INTO bills
               (user_id, category_id, title, amount, bill_date, due_date, frequency, interval_days, tenure, notes)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
             RETURNING *`,
            [userId, category_id || null, title, amount, bill_date, due_date || null,
                frequency, interval_days || null, tenure || null, notes || null]
        );
        const bill = res.rows[0];

        // Generate schedules inside the same transaction
        const dbProxy = { query: (t, p) => client.query(t, p) };
        const count = await scheduleService.generateSchedules(bill, dbProxy);

        await client.query('COMMIT');

        return { bill, schedulesCreated: count };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

/**
 * Get all active (non-deleted) bills for a user, enriched with schedule counts.
 */
const getBillsByUser = async (userId) => {
    const res = await query(
        `SELECT b.*,
                c.category_name as category,
                COUNT(s.schedule_id) FILTER (WHERE s.status = 'pending') AS pending_count,
                COUNT(s.schedule_id) FILTER (WHERE s.status = 'paid') AS paid_count,
                MIN(s.due_date) FILTER (WHERE s.status = 'pending') AS next_due_date
         FROM bills b
         LEFT JOIN categories c ON c.category_id = b.category_id
         LEFT JOIN bill_schedules s ON s.bill_id = b.bill_id
         WHERE b.user_id = $1 AND b.is_deleted = FALSE
         GROUP BY b.bill_id, c.category_name
         ORDER BY b.created_at DESC`,
        [userId]
    );
    return res.rows;
};

/**
 * Get a single bill by ID (must belong to user).
 */
const getBillById = async (billId, userId) => {
    const res = await query(
        `SELECT b.*, c.category_name as category
         FROM bills b
         LEFT JOIN categories c ON c.category_id = b.category_id
         WHERE b.bill_id = $1 AND b.user_id = $2 AND b.is_deleted = FALSE`,
        [billId, userId]
    );
    return res.rows[0] || null;
};

/**
 * Get all schedules for a bill (for the steps-7 preview and schedule page).
 */
const getBillSchedules = async (billId, userId) => {
    const res = await query(
        `SELECT s.*, t.payment_method, t.paid_date
         FROM bill_schedules s
         LEFT JOIN transactions t ON t.schedule_id = s.schedule_id
         WHERE s.bill_id = $1 AND s.user_id = $2
         ORDER BY s.due_date ASC`,
        [billId, userId]
    );
    return res.rows;
};

/**
 * Update a bill (amount/title/notes/category). Regenerates future pending schedules
 * when frequency/amount changes.
 */
const updateBill = async (billId, userId, data) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const {
            title, category_id, amount, bill_date, due_date,
            frequency, interval_days, tenure, notes,
        } = data;

        const res = await client.query(
            `UPDATE bills SET
               title = COALESCE($3, title),
               category_id = COALESCE($4, category_id),
               amount = COALESCE($5, amount),
               bill_date = COALESCE($6, bill_date),
               due_date = $7,
               frequency = COALESCE($8, frequency),
               interval_days = $9,
               tenure = $10,
               notes = $11
             WHERE bill_id = $1 AND user_id = $2 AND is_deleted = FALSE
             RETURNING *`,
            [billId, userId, title, category_id, amount, bill_date, due_date || null,
                frequency, interval_days || null, tenure || null, notes || null]
        );
        const bill = res.rows[0];
        if (!bill) { await client.query('ROLLBACK'); return null; }

        // If frequency-affecting fields changed, regenerate future schedules
        if (frequency || interval_days || tenure || bill_date) {
            await client.query(
                `DELETE FROM bill_schedules
                 WHERE bill_id = $1 AND status = 'pending' AND due_date >= CURRENT_DATE`,
                [billId]
            );
            const dbProxy = { query: (t, p) => client.query(t, p) };
            await scheduleService.generateSchedules({ ...bill, bill_date: bill.bill_date, frequency: bill.frequency }, dbProxy);
        }

        await client.query('COMMIT');
        return bill;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

/**
 * Soft-delete a bill definition + all its future pending schedules.
 */
const deleteBill = async (billId, userId) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(
            `DELETE FROM bill_schedules WHERE bill_id = $1 AND status = 'pending' AND due_date >= CURRENT_DATE`,
            [billId]
        );
        await client.query(
            `UPDATE bills SET is_deleted = TRUE WHERE bill_id = $1 AND user_id = $2`,
            [billId, userId]
        );
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

/**
 * Check for duplicate bill (same title + amount + bill_date ± 2 days).
 */
const checkDuplicate = async (userId, title, amount, billDate) => {
    const res = await query(
        `SELECT b.*, c.category_name as category
         FROM bills b
         LEFT JOIN categories c ON c.category_id = b.category_id
         WHERE b.user_id = $1
           AND b.is_deleted = FALSE
           AND LOWER(b.title) = LOWER($2)
           AND b.amount = $3
           AND ABS(b.bill_date - $4::date) <= 2`,
        [userId, title, amount, billDate]
    );
    return res.rows[0] || null;
};

/**
 * Get all categories (system + user-created).
 */
const getCategories = async (userId) => {
    const res = await query(
        `SELECT * FROM categories WHERE user_id IS NULL OR user_id = $1 ORDER BY is_default DESC, category_name ASC`,
        [userId]
    );
    return res.rows;
};

/**
 * Create a custom category for a user.
 */
const createCategory = async (userId, categoryName) => {
    const res = await query(
        `INSERT INTO categories (user_id, category_name) VALUES ($1, $2) RETURNING *`,
        [userId, categoryName]
    );
    return res.rows[0];
};

module.exports = {
    createBill, getBillsByUser, getBillById, getBillSchedules,
    updateBill, deleteBill, checkDuplicate, getCategories, createCategory,
};
