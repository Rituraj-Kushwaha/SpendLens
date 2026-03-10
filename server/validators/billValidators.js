const { body } = require('express-validator');

const CATEGORIES = ['Utilities', 'OTT', 'Internet', 'Mobile', 'Rent', 'Other'];
const FREQUENCIES = ['one-time', 'weekly', 'monthly', 'quarterly', 'annual'];

const createBillValidator = [
    body('name')
        .trim()
        .notEmpty().withMessage('Bill name is required')
        .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
    body('category')
        .notEmpty().withMessage('Category is required')
        .isIn(CATEGORIES).withMessage(`Category must be one of: ${CATEGORIES.join(', ')}`),
    body('amount')
        .notEmpty().withMessage('Amount is required')
        .isFloat({ min: 0, max: 1000000 }).withMessage('Amount must be between 0 and 1,000,000'),
    body('dueDate')
        .notEmpty().withMessage('Due date is required')
        .isISO8601().withMessage('Due date must be a valid date'),
    body('frequency')
        .notEmpty().withMessage('Frequency is required')
        .isIn(FREQUENCIES).withMessage(`Frequency must be one of: ${FREQUENCIES.join(', ')}`),
    body('isRecurring')
        .optional()
        .isBoolean().withMessage('isRecurring must be a boolean'),
    body('billingDate')
        .optional()
        .isISO8601().withMessage('Billing date must be a valid date'),
    body('notes')
        .optional()
        .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
];

const updateBillValidator = [
    body('name')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
    body('category')
        .optional()
        .isIn(CATEGORIES).withMessage(`Category must be one of: ${CATEGORIES.join(', ')}`),
    body('amount')
        .optional()
        .isFloat({ min: 0, max: 1000000 }).withMessage('Amount must be between 0 and 1,000,000'),
    body('dueDate')
        .optional()
        .isISO8601().withMessage('Due date must be a valid date'),
    body('frequency')
        .optional()
        .isIn(FREQUENCIES).withMessage(`Frequency must be one of: ${FREQUENCIES.join(', ')}`),
    body('isRecurring')
        .optional()
        .isBoolean().withMessage('isRecurring must be a boolean'),
    body('billingDate')
        .optional()
        .isISO8601().withMessage('Billing date must be a valid date'),
    body('notes')
        .optional()
        .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
    body('status')
        .optional()
        .isIn(['active', 'paid', 'overdue', 'paused']).withMessage('Invalid status'),
];

module.exports = { createBillValidator, updateBillValidator };
