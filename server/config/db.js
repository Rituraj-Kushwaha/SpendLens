const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
    console.error('❌ Unexpected PostgreSQL pool error', err.message);
});

/**
 * Execute a parameterised SQL query.
 * @param {string} text  — SQL string with $1, $2 ... placeholders
 * @param {Array}  params — parameter values
 */
const query = (text, params) => pool.query(text, params);

const connect = async () => {
    const client = await pool.connect();
    return client;
};

const testConnection = async () => {
    try {
        const res = await query('SELECT NOW() AS now');
        console.log(`✅ PostgreSQL connected at ${res.rows[0].now}`);
    } catch (err) {
        console.error('❌ PostgreSQL connection failed:', err.message);
        throw err;
    }
};

module.exports = { query, connect, pool, testConnection };
