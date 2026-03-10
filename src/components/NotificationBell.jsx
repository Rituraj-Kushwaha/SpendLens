import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { notificationService } from '../services/billService';

export default function NotificationBell() {
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const ref = useRef(null);

    const fetchNotifs = async () => {
        try {
            const res = await notificationService.getNotifications();
            setNotifications(res.data.data.notifications || []);
            setUnreadCount(res.data.data.unreadCount || 0);
        } catch { /* silently ignore */ }
    };

    useEffect(() => {
        fetchNotifs();
        const interval = setInterval(fetchNotifs, 30000); // poll every 30s
        return () => clearInterval(interval);
    }, []);

    // Close on outside click
    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleOpen = async () => {
        setOpen(o => !o);
        if (!open && unreadCount > 0) {
            await notificationService.markAllRead();
            setUnreadCount(0);
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        }
    };

    const timeAgo = (dateStr) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    };

    return (
        <div className="notif-bell-wrap" ref={ref}>
            <button className="notif-bell-btn" onClick={handleOpen} aria-label="Notifications">
                <Bell size={20} />
                {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>
            {open && (
                <div className="notif-dropdown">
                    <div className="notif-dropdown-header">
                        <span>Notifications</span>
                        {unreadCount > 0 && (
                            <button style={{ background: 'none', border: 'none', color: 'var(--accent-main)', cursor: 'pointer', fontSize: '0.8rem' }}
                                onClick={async () => { await notificationService.markAllRead(); setUnreadCount(0); }}>
                                Mark all read
                            </button>
                        )}
                    </div>
                    {notifications.length === 0 ? (
                        <div className="notif-empty">You're all caught up 🎉</div>
                    ) : (
                        notifications.map(n => (
                            <div key={n.notification_id} className={`notif-item ${!n.is_read ? 'notif-item--unread' : ''}`}
                                onClick={async () => { await notificationService.markRead(n.notification_id); }}>
                                <div className="notif-item__msg">{n.message}</div>
                                <div className="notif-item__time">{timeAgo(n.created_at)}</div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
