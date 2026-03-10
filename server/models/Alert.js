const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        billId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Bill',
            default: null,
        },
        type: {
            type: String,
            required: true,
            enum: [
                'upcoming_due',
                'overdue',
                'overspending',
                'duplicate_detected',
                'savings_opportunity',
                'system',
            ],
        },
        title: {
            type: String,
            required: [true, 'Alert title is required'],
        },
        message: {
            type: String,
            required: [true, 'Alert message is required'],
        },
        isRead: {
            type: Boolean,
            default: false,
        },
        isDismissed: {
            type: Boolean,
            default: false,
        },
        severity: {
            type: String,
            enum: ['low', 'medium', 'high'],
            default: 'medium',
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    { timestamps: true }
);

// Primary alerts feed: unread first, newest first
alertSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);
