const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const createAccessToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_ACCESS_SECRET, {
        expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
    });
};

const createRefreshToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
    });
};

/**
 * Hash a refresh token with SHA-256 before storing in database.
 * Even a database breach won't expose valid tokens.
 */
const hashToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

module.exports = { createAccessToken, createRefreshToken, hashToken };
