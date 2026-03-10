const Alert = require('../models/Alert');
const Bill = require('../models/Bill');

/**
 * Create an upcoming due date alert for a bill if one doesn't already exist in the last 24h.
 */
const createUpcomingAlert = async (userId, bill) => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existing = await Alert.findOne({
        userId,
        billId: bill._id,
        type: 'upcoming_due',
        createdAt: { $gte: oneDayAgo },
    });
    if (existing) return null;

    const daysUntil = Math.ceil((new Date(bill.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    return Alert.create({
        userId,
        billId: bill._id,
        type: 'upcoming_due',
        title: `${bill.name} due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`,
        message: `Your ${bill.name} of ₹${bill.amount.toLocaleString('en-IN')} is due on ${new Date(bill.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}. Make sure you have sufficient balance.`,
        severity: daysUntil <= 1 ? 'high' : daysUntil <= 3 ? 'medium' : 'low',
        metadata: { daysUntilDue: daysUntil, amount: bill.amount },
    });
};

/**
 * Check for overdue bills — updates bill status and creates alert.
 */
const checkOverdue = async (userId) => {
    const now = new Date();
    const overdueBills = await Bill.find({
        userId,
        dueDate: { $lt: now },
        status: 'active',
    });

    const alerts = [];
    for (const bill of overdueBills) {
        bill.status = 'overdue';
        await bill.save();

        const alert = await Alert.create({
            userId,
            billId: bill._id,
            type: 'overdue',
            title: `${bill.name} is overdue`,
            message: `Your ${bill.name} of ₹${bill.amount.toLocaleString('en-IN')} was due on ${new Date(bill.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} and is now overdue.`,
            severity: 'high',
            metadata: { amount: bill.amount, dueDate: bill.dueDate },
        });
        alerts.push(alert);
    }
    return alerts;
};

/**
 * Check for upcoming bills within reminderDaysBefore.
 */
const checkUpcoming = async (userId, reminderDays = 3) => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + reminderDays * 24 * 60 * 60 * 1000);

    const upcomingBills = await Bill.find({
        userId,
        dueDate: { $gte: now, $lte: futureDate },
        status: 'active',
    });

    const alerts = [];
    for (const bill of upcomingBills) {
        const alert = await createUpcomingAlert(userId, bill);
        if (alert) alerts.push(alert);
    }
    return alerts;
};

/**
 * Check for overspending — compares current month to 3-month average.
 */
const checkOverspending = async (userId) => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Current month total
    const currentBills = await Bill.find({
        userId,
        dueDate: { $gte: currentMonthStart },
        status: { $ne: 'paused' },
    });
    const currentTotal = currentBills.reduce((s, b) => s + b.amount, 0);

    // Previous 3 months average
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const prevBills = await Bill.find({
        userId,
        dueDate: { $gte: threeMonthsAgo, $lt: currentMonthStart },
        status: { $ne: 'paused' },
    });
    const prevTotal = prevBills.reduce((s, b) => s + b.amount, 0);
    const avgMonthly = prevTotal / 3;

    if (avgMonthly === 0 || currentTotal <= avgMonthly * 1.3) return null;

    const percentIncrease = Math.round(((currentTotal - avgMonthly) / avgMonthly) * 100);

    // Don't duplicate within 24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existing = await Alert.findOne({
        userId,
        type: 'overspending',
        createdAt: { $gte: oneDayAgo },
    });
    if (existing) return null;

    // Find top spending category
    const categoryTotals = {};
    currentBills.forEach((b) => {
        categoryTotals[b.category] = (categoryTotals[b.category] || 0) + b.amount;
    });
    const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

    return Alert.create({
        userId,
        type: 'overspending',
        title: 'Overspending Alert',
        message: `Your spending is up ${percentIncrease}% this month compared to your 3-month average. ${topCategory ? `Top category: ${topCategory[0]} at ₹${topCategory[1].toLocaleString('en-IN')}.` : ''}`,
        severity: percentIncrease > 50 ? 'high' : 'medium',
        metadata: {
            currentAmount: currentTotal,
            averageAmount: Math.round(avgMonthly),
            percentageIncrease: percentIncrease,
            topCategory: topCategory ? topCategory[0] : null,
        },
    });
};

/**
 * Check for duplicate subscriptions — bills in the same category with similar names.
 */
const checkDuplicates = async (userId) => {
    const recurringBills = await Bill.find({ userId, isRecurring: true, status: 'active' });
    const alerts = [];

    // Simple approach: group by category and check for similar names
    const byCategory = {};
    recurringBills.forEach((b) => {
        if (!byCategory[b.category]) byCategory[b.category] = [];
        byCategory[b.category].push(b);
    });

    for (const [category, bills] of Object.entries(byCategory)) {
        if (bills.length < 2) continue;
        for (let i = 0; i < bills.length; i++) {
            for (let j = i + 1; j < bills.length; j++) {
                const nameA = bills[i].name.toLowerCase();
                const nameB = bills[j].name.toLowerCase();
                // Simple check: if names share a significant word (3+ chars)
                const wordsA = nameA.split(/\s+/);
                const wordsB = nameB.split(/\s+/);
                const shared = wordsA.some((w) => w.length >= 3 && wordsB.some((w2) => w2.includes(w) || w.includes(w2)));

                if (shared) {
                    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                    const existing = await Alert.findOne({
                        userId,
                        type: 'duplicate_detected',
                        'metadata.duplicateBillIds': { $all: [bills[i]._id, bills[j]._id] },
                        createdAt: { $gte: oneDayAgo },
                    });
                    if (existing) continue;

                    const alert = await Alert.create({
                        userId,
                        type: 'duplicate_detected',
                        title: 'Duplicate Detected',
                        message: `We detected similar charges for "${bills[i].name}" and "${bills[j].name}" in ${category}. Please verify if this is intentional.`,
                        severity: 'medium',
                        metadata: {
                            duplicateBillIds: [bills[i]._id, bills[j]._id],
                            totalWasted: bills[i].amount + bills[j].amount,
                        },
                    });
                    alerts.push(alert);
                }
            }
        }
    }
    return alerts;
};

/**
 * Auto-advance due dates ONLY for one-time overdue bills (set status to overdue).
 * Recurring bills are handled via `updateBill` (next occurrence created on mark-paid)
 * so we intentionally skip them here to avoid duplicate/conflicting advances.
 */
const advanceDueDates = async (userId) => {
    const now = new Date();
    // Only consider non-recurring overdue bills that are still 'active'
    const overdueSingleBills = await Bill.find({
        userId,
        isRecurring: false,
        frequency: 'one-time',
        dueDate: { $lt: now },
        status: 'active',
    });

    for (const bill of overdueSingleBills) {
        // Mark as overdue so the UI reflects reality (checkOverdue handles this too,
        // but this acts as a safety net for bills missed by the cron window)
        bill.status = 'overdue';
        await bill.save();
    }
};

/**
 * Delete stale alerts for a bill and regenerate based on new data.
 */
const refreshBillAlerts = async (userId, billId) => {
    await Alert.deleteMany({ userId, billId, type: { $in: ['upcoming_due', 'overdue'] } });
    const bill = await Bill.findOne({ _id: billId, userId });
    if (bill && bill.status === 'active') {
        const now = new Date();
        const daysUntil = Math.ceil((new Date(bill.dueDate) - now) / (1000 * 60 * 60 * 24));
        if (daysUntil > 0 && daysUntil <= 7) {
            await createUpcomingAlert(userId, bill);
        }
    }
};

module.exports = {
    createUpcomingAlert,
    checkOverdue,
    checkUpcoming,
    checkOverspending,
    checkDuplicates,
    advanceDueDates,
    refreshBillAlerts,
};
