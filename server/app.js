const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const billRoutes = require('./routes/billRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const alertRoutes = require('./routes/alertRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

const parseAllowedOrigins = () => {
    // Supports comma-separated values in CLIENT_ORIGIN for production + preview URLs.
    const raw = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
    return raw
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
};

// ── Security & Parsing ──────────────────────────────────────────────────────
app.use(helmet());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// ── CORS ──────────────────────────────────────────────────────────────────
const allowedOrigins = parseAllowedOrigins();
app.use(cors({
    origin: (origin, callback) => {
        // Allow non-browser requests (no Origin header) and explicit allowlist.
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

// ── Rate Limiting ──────────────────────────────────────────────────────────
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, data: null, error: 'Too many attempts. Try again in 15 minutes.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/notifications', notificationRoutes);

// ── Health Check ──────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
    try {
        const { testConnection } = require('./config/db');
        await testConnection();
        res.status(200).json({ success: true, data: { server: 'ok', db: 'ok' }, error: null });
    } catch {
        res.status(503).json({ success: false, data: { server: 'ok', db: 'error' }, error: 'Database unreachable' });
    }
});

// ── Error Handling ─────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(globalErrorHandler);

module.exports = app;
