import axios from 'axios';

/**
 * Centralized Axios instance for all API calls.
 * - baseURL points to the backend API
 * - withCredentials sends the refresh-token cookie automatically
 * - Request interceptor attaches access token from memory
 * - Response interceptor auto-refreshes on 401
 */
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
});

// Token stored in memory — never localStorage (XSS protection)
let accessToken = null;

export const setAccessToken = (token) => {
    accessToken = token;
};

export const getAccessToken = () => accessToken;

export const clearAccessToken = () => {
    accessToken = null;
};

// ── Request Interceptor: attach Bearer token ──
api.interceptors.request.use(
    (config) => {
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ── Response Interceptor: auto-refresh on 401 ──
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Only try refresh for 401 errors, and NOT for these auth endpoints
        const skipRefreshUrls = ['/auth/refresh', '/auth/login', '/auth/register', '/auth/me'];
        const shouldSkip = skipRefreshUrls.some((u) => originalRequest.url.includes(u));

        if (error.response?.status === 401 && !originalRequest._retry && !shouldSkip) {
            if (isRefreshing) {
                // Queue all 401 requests while refresh is in progress
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then((token) => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return api(originalRequest);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const { data } = await axios.post(
                    `${api.defaults.baseURL}/auth/refresh`,
                    {},
                    { withCredentials: true }
                );
                const newToken = data.data.accessToken;
                setAccessToken(newToken);
                processQueue(null, newToken);
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                clearAccessToken();
                // Do NOT do window.location.href here — it causes infinite reload loops.
                // Let AuthContext handle the unauthenticated state via its own error handling.
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default api;
