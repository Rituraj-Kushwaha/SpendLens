import api from './api';

export const alertService = {
    getAlerts: (params) => api.get('/alerts', { params }),
    markAlertRead: (id) => api.patch(`/alerts/${id}/read`),
    markAllAlertsRead: () => api.patch('/alerts/read-all'),
    markAllRead: () => api.patch('/alerts/read-all'),
    dismissAlert: (id) => api.delete(`/alerts/${id}`),
};
