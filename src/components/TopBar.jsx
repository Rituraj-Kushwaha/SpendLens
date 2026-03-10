import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Moon, Search, Sun, Menu } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import NotificationBell from './NotificationBell';
import './TopBar.css';

const pageTitles = {
    '/dashboard': 'Dashboard',
    '/bills': 'Bills',
    '/analytics': 'Analytics',
    '/alerts': 'Alerts',
    '/settings': 'Settings',
};

export default function TopBar({ onMenuToggle }) {
    const { theme, toggleTheme, isDark } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();
    const [searchExpanded, setSearchExpanded] = useState(false);
    const [searchValue, setSearchValue] = useState('');

    const pageTitle = pageTitles[location.pathname] || 'SpendLens';

    return (
        <header className="topbar">
            <div className="topbar__left">
                <button
                    className="topbar__menu-btn"
                    onClick={onMenuToggle}
                    aria-label="Toggle menu"
                >
                    <Menu size={20} />
                </button>
                <h3 className="topbar__title">{pageTitle}</h3>
            </div>

            <div className="topbar__right">
                {/* Search */}
                <div className={`topbar__search ${searchExpanded ? 'topbar__search--expanded' : ''}`}>
                    <button
                        className="topbar__search-btn"
                        onClick={() => setSearchExpanded(!searchExpanded)}
                        aria-label="Search"
                    >
                        <Search size={18} />
                    </button>
                    {searchExpanded && (
                        <input
                            type="text"
                            className="topbar__search-input"
                            placeholder="Search bills, categories..."
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            autoFocus
                            onBlur={() => {
                                if (!searchValue) setSearchExpanded(false);
                            }}
                        />
                    )}
                </div>

                {/* Theme Toggle */}
                <button
                    className="topbar__theme-btn"
                    onClick={toggleTheme}
                    aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
                >
                    <span className={`topbar__theme-icon ${isDark ? 'topbar__theme-icon--dark' : 'topbar__theme-icon--light'}`}>
                        {isDark ? <Moon size={18} /> : <Sun size={18} />}
                    </span>
                </button>

                {/* Notifications */}
                <NotificationBell />
            </div>
        </header>
    );
}
