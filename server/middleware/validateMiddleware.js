const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

/**
 * Middleware that runs after express-validator chains.
 * Collects validation errors and throws a single AppError.
 */
const runValidation = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const messages = errors.array().map((e) => e.msg);
        return next(new AppError(messages.join('. '), 400));
    }
    next();
};

module.exports = { runValidation };
