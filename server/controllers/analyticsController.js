const catchAsync = require('../utils/catchAsync');
const analyticsService = require('../services/analyticsService');
const transactionService = require('../services/transactionService');
const userService = require('../services/userService');

// GET /api/analytics/summary
const getSummary = catchAsync(async (req, res) => {
    const user = await userService.findById(req.user.userId);
    const data = await analyticsService.getSpendingSummary(req.user.userId, user.monthly_budget || 0);
    res.status(200).json({ success: true, data, error: null });
});

// GET /api/analytics/category?month=YYYY-MM
const getCategoryBreakdown = catchAsync(async (req, res) => {
    const now = new Date();
    let year = now.getFullYear(), month = now.getMonth() + 1;
    if (req.query.month) {
        const [y, m] = req.query.month.split('-').map(Number);
        if (y && m) { year = y; month = m; }
    }
    const breakdown = await analyticsService.getCategoryBreakdown(req.user.userId, year, month);
    res.status(200).json({ success: true, data: { breakdown, year, month }, error: null });
});

// GET /api/analytics/monthly?months=12
const getMonthlyTrend = catchAsync(async (req, res) => {
    const months = Math.min(24, Math.max(1, parseInt(req.query.months) || 12));
    const trend = await analyticsService.getMonthlyTrend(req.user.userId, months);
    res.status(200).json({ success: true, data: { trend }, error: null });
});

// GET /api/analytics/insights
const getInsights = catchAsync(async (req, res) => {
    const insights = await analyticsService.getInsights(req.user.userId);
    res.status(200).json({ success: true, data: { insights }, error: null });
});

// GET /api/analytics/subscriptions
const getSubscriptionCosts = catchAsync(async (req, res) => {
    const subscriptions = await analyticsService.getSubscriptionCosts(req.user.userId);
    res.status(200).json({ success: true, data: { subscriptions }, error: null });
});

// GET /api/analytics/transactions
const getTransactions = catchAsync(async (req, res) => {
    const { month, category, payment_method } = req.query;
    const transactions = await transactionService.getTransactions(req.user.userId, { month, category, payment_method });
    res.status(200).json({ success: true, data: { transactions }, error: null });
});

module.exports = { getSummary, getCategoryBreakdown, getMonthlyTrend, getInsights, getSubscriptionCosts, getTransactions };
