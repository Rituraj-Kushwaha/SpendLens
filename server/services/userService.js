const { query, connect } = require('../config/db');
const bcrypt = require('bcryptjs');

const SAFE_FIELDS = 'user_id, name, email, monthly_budget, currency, theme, date_format, notification_prefs, created_at';

const findByEmail = async (email) => {
    const res = await query(
        `SELECT ${SAFE_FIELDS}, password_hash FROM users WHERE email = $1`,
        [email.toLowerCase().trim()]
    );
    return res.rows[0] || null;
};

const findById = async (userId) => {
    const res = await query(`SELECT ${SAFE_FIELDS} FROM users WHERE user_id = $1`, [userId]);
    return res.rows[0] || null;
};

const createUser = async ({ name, email, password }) => {
    const password_hash = await bcrypt.hash(password, 12);
    const res = await query(
        `INSERT INTO users (name, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING ${SAFE_FIELDS}`,
        [name.trim(), email.toLowerCase().trim(), password_hash]
    );
    return res.rows[0];
};

const updateUser = async (userId, fields) => {
    const allowed = ['name', 'currency', 'theme', 'date_format', 'monthly_budget', 'notification_prefs'];
    const sets = [];
    const values = [];
    let idx = 1;
    for (const [key, val] of Object.entries(fields)) {
        if (allowed.includes(key)) {
            sets.push(`${key} = $${idx++}`);
            values.push(val);
        }
    }
    if (!sets.length) return findById(userId);
    values.push(userId);
    const res = await query(
        `UPDATE users SET ${sets.join(', ')} WHERE user_id = $${idx} RETURNING ${SAFE_FIELDS}`,
        values
    );
    return res.rows[0];
};

const updatePassword = async (userId, newPassword) => {
    const password_hash = await bcrypt.hash(newPassword, 12);
    await query(`UPDATE users SET password_hash = $1 WHERE user_id = $2`, [password_hash, userId]);
};

const verifyPassword = async (candidate, hash) => bcrypt.compare(candidate, hash);

// Refresh token management
const storeRefreshToken = async (userId, tokenHash, expiresAt) => {
    // Delete old tokens first (single session)
    await query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [userId]);
    await query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
        [userId, tokenHash, expiresAt]
    );
};

const findRefreshToken = async (tokenHash) => {
    const res = await query(
        `SELECT * FROM refresh_tokens WHERE token_hash = $1 AND expires_at > NOW()`,
        [tokenHash]
    );
    return res.rows[0] || null;
};

const deleteRefreshToken = async (tokenHash) => {
    await query(`DELETE FROM refresh_tokens WHERE token_hash = $1`, [tokenHash]);
};

const deleteAccount = async (userId) => {
    // CASCADE handles bills, schedules, transactions, notifications, refresh_tokens
    await query(`DELETE FROM users WHERE user_id = $1`, [userId]);
};

module.exports = {
    findByEmail, findById, createUser, updateUser, updatePassword,
    verifyPassword, storeRefreshToken, findRefreshToken, deleteRefreshToken, deleteAccount,
};
