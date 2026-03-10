const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');
const { testConnection } = require('./config/db');
const { initAlertChecker } = require('./jobs/alertChecker');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        // 1. Verify PostgreSQL connection
        await testConnection();

        // 2. Start HTTP server
        app.listen(PORT, () => {
            console.log(`🚀 SpendLens API running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
        });

        // 3. Initialize scheduled jobs AFTER DB connection confirmed
        initAlertChecker();
    } catch (err) {
        console.error('❌ Failed to start server:', err.message);
        process.exit(1);
    }
};

startServer();
