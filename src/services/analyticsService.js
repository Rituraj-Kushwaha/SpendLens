import api from './api';

export const analyticsService = {
    getSummary: () => api.get('/analytics/summary'),
    getMonthlyTrend: (months = 12) => api.get('/analytics/monthly', { params: { months } }),
    getCategoryBreakdown: (month) => api.get('/analytics/category', { params: { month } }),
    getSubscriptionCosts: () => api.get('/analytics/subscriptions'),
    getInsights: () => api.get('/analytics/insights'),
    getTransactions: (params) => api.get('/analytics/transactions', { params }),
};
