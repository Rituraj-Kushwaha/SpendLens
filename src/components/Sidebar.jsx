import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Receipt, BarChart3, Bell, Settings as SettingsIcon, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { alertService } from '../services/alertService';
import { useState, useEffect } from 'react';
import './Sidebar.css';

const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/bills', label: 'Bills', icon: Receipt },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/alerts', label: 'Alerts', icon: Bell },
    { path: '/settings', label: 'Settings', icon: SettingsIcon },
];

export default function Sidebar({ collapsed = false }) {
    const location = useLocation();
    const { user, logout } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const { data } = await alertService.getAlerts({ isRead: false });
                setUnreadCount(data.data.unreadCount);
            } catch (err) { }
        };
        fetchAlerts();
    }, []);

    const initials = user?.name
        ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : '?';

    return (
        <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
            {/* Logo */}
            <div className="sidebar__logo">
                <div className="sidebar__logo-icon">
                    <svg viewBox="0 0 32 32" fill="none" width="28" height="28">
                        <circle cx="16" cy="16" r="14" stroke="#E8C547" strokeWidth="2.5" />
                        <circle cx="16" cy="16" r="6" stroke="#E8C547" strokeWidth="2" />
                        <line x1="22" y1="22" x2="28" y2="28" stroke="#E8C547" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                </div>
                {!collapsed && <span className="sidebar__logo-text">SpendLens</span>}
            </div>

            {/* Navigation */}
            <nav className="sidebar__nav">
                {navItems.map(item => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={`sidebar__nav-item ${isActive ? 'sidebar__nav-item--active' : ''}`}
                            aria-label={item.label}
                        >
                            <div className="sidebar__nav-indicator" />
                            <Icon size={20} />
                            {!collapsed && <span className="sidebar__nav-label">{item.label}</span>}
                            {item.path === '/alerts' && unreadCount > 0 && (
                                <span className="sidebar__badge">{unreadCount}</span>
                            )}
                        </NavLink>
                    );
                })}
            </nav>

            {/* User Section */}
            <div className="sidebar__user">
                <div className="sidebar__avatar" aria-label={`Avatar for ${user?.name || 'User'}`}>
                    {initials}
                </div>
                {!collapsed && (
                    <div className="sidebar__user-info">
                        <span className="sidebar__user-name">{user?.name}</span>
                        <span className="sidebar__user-email">{user?.email}</span>
                    </div>
                )}
                <button
                    className="sidebar__logout-btn"
                    onClick={logout}
                    aria-label="Log out"
                    title="Log out"
                >
                    <LogOut size={16} />
                </button>
            </div>
        </aside>
    );
}
