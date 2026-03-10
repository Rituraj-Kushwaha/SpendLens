import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Receipt, BarChart3, Bell, Settings } from 'lucide-react';
import { mockAlerts } from '../data/mockAlerts';

const tabs = [
    { path: '/dashboard', label: 'Home', icon: LayoutDashboard },
    { path: '/bills', label: 'Bills', icon: Receipt },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/alerts', label: 'Alerts', icon: Bell },
    { path: '/settings', label: 'Settings', icon: Settings },
];

export default function BottomTabBar() {
    const location = useLocation();
    const unreadCount = mockAlerts.filter(a => !a.isRead).length;

    return (
        <nav className="bottom-tab-bar" aria-label="Main navigation">
            {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = location.pathname === tab.path;
                return (
                    <NavLink
                        key={tab.path}
                        to={tab.path}
                        className={`bottom-tab ${isActive ? 'bottom-tab--active' : ''}`}
                        aria-label={tab.label}
                    >
                        <div className="bottom-tab__icon-wrap">
                            <Icon size={20} />
                            {tab.path === '/alerts' && unreadCount > 0 && (
                                <span className="bottom-tab__badge">{unreadCount}</span>
                            )}
                        </div>
                        <span className="bottom-tab__label">{tab.label}</span>
                    </NavLink>
                );
            })}
        </nav>
    );
}
