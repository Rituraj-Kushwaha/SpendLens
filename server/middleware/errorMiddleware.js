const AppError = require('../utils/AppError');

/**
 * 404 handler for unmatched routes
 */
const notFoundHandler = (req, res, next) => {
    next(new AppError(`Route not found: ${req.originalUrl}`, 404));
};

/**
 * Global error handler — converts known error types to clean AppError responses.
 * In development: includes stack trace.
 * In production: only operational errors expose message; programming errors get generic response.
 */
const globalErrorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // Convert known Mongoose / JWT errors to AppError
    if (err.name === 'CastError') {
        err = new AppError('Invalid ID format', 400);
    }
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        err = new AppError(`This ${field} is already in use`, 400);
    }
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map((e) => e.message);
        err = new AppError(messages.join('. '), 400);
    }
    if (err.name === 'JsonWebTokenError') {
        err = new AppError('Invalid token. Please log in again.', 401);
    }
    if (err.name === 'TokenExpiredError') {
        err = new AppError('Your token has expired. Please log in again.', 401);
    }

    // Development response
    if (process.env.NODE_ENV === 'development') {
        return res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
            error: err,
            stack: err.stack,
        });
    }

    // Production response
    if (err.isOperational) {
        return res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
        });
    }

    // Programming error — don't leak details
    console.error('ERROR 💥:', err);
    return res.status(500).json({
        status: 'error',
        message: 'Something went wrong',
    });
};

module.exports = { notFoundHandler, globalErrorHandler };
