import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import BottomTabBar from './BottomTabBar';
import { useMediaQuery } from '../hooks/useMediaQuery';
import './Layout.css';

export default function Layout() {
    const isMobile = useMediaQuery('(max-width: 640px)');
    const isTablet = useMediaQuery('(max-width: 1024px)');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="layout">
            {/* Sidebar - hidden on mobile, collapsed on tablet */}
            {!isMobile && <Sidebar collapsed={isTablet && !isMobile} />}

            {/* Mobile sidebar overlay */}
            {isMobile && mobileMenuOpen && (
                <>
                    <div className="layout__overlay" onClick={() => setMobileMenuOpen(false)} />
                    <Sidebar collapsed={false} />
                </>
            )}

            {/* Top Bar */}
            <TopBar onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />

            {/* Main Content */}
            <main className={`layout__content ${isTablet && !isMobile ? 'layout__content--tablet' : ''} ${isMobile ? 'layout__content--mobile' : ''}`}>
                <div className="layout__inner">
                    <Outlet />
                </div>
            </main>

            {/* Mobile Bottom Tab Bar */}
            {isMobile && <BottomTabBar />}
        </div>
    );
}
