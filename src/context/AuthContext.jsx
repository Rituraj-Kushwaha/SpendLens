import { createContext, useContext, useState, useEffect } from 'react';
import api, { setAccessToken, clearAccessToken } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); // true while checking silent refresh

    // Apply saved preferences to localStorage so ThemeContext / CurrencyContext pick them up
    const applyUserPrefs = (u) => {
        if (u?.theme) {
            localStorage.setItem('spendlens-theme', JSON.stringify(u.theme));
            document.documentElement.setAttribute('data-theme', u.theme);
        }
        if (u?.currency) {
            localStorage.setItem('spendlens-currency', JSON.stringify(u.currency));
        }
    };

    // Silent refresh on app mount — restore session from the refresh-token cookie
    useEffect(() => {
        const silentRefresh = async () => {
            try {
                // Step 1: Try to get a new access token using the refresh cookie
                const refreshRes = await api.post('/auth/refresh', {});
                const newAccessToken = refreshRes.data.data.accessToken;
                setAccessToken(newAccessToken);

                // Step 2: Fetch the actual user profile with the fresh token
                const meRes = await api.get('/auth/me');
                const u = meRes.data.data.user;
                applyUserPrefs(u);
                setUser(u);
            } catch {
                // No valid refresh token cookie → user is logged out
                clearAccessToken();
                setUser(null);
            } finally {
                setLoading(false);
            }
        };
        silentRefresh();
    }, []);

    const login = async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        setAccessToken(data.data.accessToken);
        applyUserPrefs(data.data.user);
        setUser(data.data.user);
        return data.data.user;
    };

    const register = async (name, email, password, confirmPassword) => {
        const { data } = await api.post('/auth/register', { name, email, password, confirmPassword });
        setAccessToken(data.data.accessToken);
        applyUserPrefs(data.data.user);
        setUser(data.data.user);
        return data.data.user;
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout');
        } catch {
            // Logout even if the API call fails
        }
        clearAccessToken();
        setUser(null);
    };

    const updateUser = (updatedUser) => {
        applyUserPrefs(updatedUser);
        setUser(updatedUser);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
    return ctx;
}
