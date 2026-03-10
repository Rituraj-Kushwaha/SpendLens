const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            minlength: [2, 'Name must be at least 2 characters'],
            maxlength: [50, 'Name cannot exceed 50 characters'],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
        },
        passwordHash: {
            type: String,
            required: [true, 'Password is required'],
            select: false, // Never returned in queries by default
        },
        currency: {
            type: String,
            default: 'INR',
            enum: ['INR', 'USD', 'EUR', 'GBP'],
        },
        theme: {
            type: String,
            default: 'dark',
            enum: ['dark', 'light'],
        },
        dateFormat: {
            type: String,
            default: 'DD/MM/YYYY',
        },
        monthlyBudget: {
            type: Number,
            default: 0,
            min: 0,
        },
        notificationPreferences: {
            billDueReminders: { type: Boolean, default: true },
            overspendingAlerts: { type: Boolean, default: true },
            weeklySummary: { type: Boolean, default: false },
            monthlyReport: { type: Boolean, default: false },
            reminderDaysBefore: { type: Number, default: 3 },
        },
    },
    {
        timestamps: true,
        toJSON: {
            transform(doc, ret) {
                delete ret.passwordHash;
                delete ret.__v;
                return ret;
            },
        },
    }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('passwordHash')) return next();
    this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
