const mongoose = require('mongoose');

const billSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: [true, 'Bill name is required'],
            trim: true,
            maxlength: [100, 'Name cannot exceed 100 characters'],
        },
        category: {
            type: String,
            required: [true, 'Category is required'],
            enum: ['Utilities', 'OTT', 'Internet', 'Mobile', 'Rent', 'Subscription', 'Food', 'Transport', 'Health', 'Other'],
        },
        amount: {
            type: Number,
            required: [true, 'Amount is required'],
            min: [0, 'Amount cannot be negative'],
            max: [1000000, 'Amount seems too large'],
        },
        billingDate: {
            type: Date,
            required: [true, 'Billing date is required'],
        },
        dueDate: {
            type: Date,
        },
        frequency: {
            type: String,
            required: [true, 'Frequency is required'],
            enum: ['one-time', 'weekly', 'monthly', 'quarterly', 'annual'],
        },
        isRecurring: {
            type: Boolean,
            default: false,
        },
        isSubscription: {
            type: Boolean,
            default: false,
        },
        status: {
            type: String,
            enum: ['active', 'paid', 'overdue', 'paused'],
            default: 'active',
        },
        paymentMethod: {
            type: String,
            enum: ['UPI', 'Card', 'Cash', 'BankTransfer'],
        },
        paidDate: {
            type: Date,
        },
        notes: {
            type: String,
            maxlength: [500, 'Notes cannot exceed 500 characters'],
        },
        // Tenure tracking: how many total periods this bill repeats
        tenure: {
            type: Number,
            min: [1, 'Tenure must be at least 1'],
        },
        // Decremented each time the next occurrence is created; 0 means no more occurrences
        tenureRemaining: {
            type: Number,
            min: [0, 'Tenure remaining cannot be negative'],
        },
        // Links recurring child bills back to the original parent bill
        parentBillId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Bill',
        },
    },
    { timestamps: true }
);

// Compound indexes for common query patterns
billSchema.index({ userId: 1, dueDate: 1 });
billSchema.index({ userId: 1, category: 1 });
billSchema.index({ userId: 1, isRecurring: 1 });
billSchema.index({ userId: 1, status: 1, dueDate: 1 });

module.exports = mongoose.model('Bill', billSchema);
