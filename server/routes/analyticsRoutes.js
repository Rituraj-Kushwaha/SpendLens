const express = require('express');
const router = express.Router();
const { getSummary, getCategoryBreakdown, getMonthlyTrend, getInsights, getSubscriptionCosts, getTransactions } = require('../controllers/analyticsController');
const { verifyAccessToken } = require('../middleware/authMiddleware');

router.use(verifyAccessToken);

router.get('/summary', getSummary);
router.get('/category', getCategoryBreakdown);
router.get('/monthly', getMonthlyTrend);
router.get('/insights', getInsights);
router.get('/subscriptions', getSubscriptionCosts);
router.get('/transactions', getTransactions);

module.exports = router;
