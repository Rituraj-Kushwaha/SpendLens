import api from './api';

export const billService = {
    // Bills CRUD
    getBills: () => api.get('/bills'),
    getBillById: (id) => api.get(`/bills/${id}`),
    createBill: (data) => api.post('/bills', data),
    updateBill: (id, data) => api.put(`/bills/${id}`, data),
    deleteBill: (id, params) => api.delete(`/bills/${id}`, { params }),

    // Categories
    getCategories: () => api.get('/bills/categories'),
    createCategory: (category_name) => api.post('/bills/categories', { category_name }),

    // Mark as paid (atomic)
    markPaid: (scheduleId, data) => api.post('/bills/pay', { scheduleId, ...data }),

    // Dashboard: pending + overdue + paid-this-month
    getDashboardSchedules: () => api.get('/bills/dashboard'),
};

export const notificationService = {
    getNotifications: () => api.get('/notifications'),
    markRead: (id) => api.post(`/notifications/${id}/read`),
    markAllRead: () => api.post('/notifications/read-all'),
};
