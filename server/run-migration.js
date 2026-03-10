require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/db');

const runMigration = async () => {
    try {
        console.log(`Connecting to PostgreSQL using DATABASE_URL = ${process.env.DATABASE_URL ? 'Loaded' : 'MISSING'}`);
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL is missing in .env');
        }

        const sql = fs.readFileSync(path.join(__dirname, 'migrations', '001_init.sql'), 'utf8');

        await pool.query(sql);
        console.log('✅ Migrations executed successfully!');

    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    } finally {
        await pool.end();
        process.exit();
    }
};

runMigration();
