import { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import Badge from '../components/Badge';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import { alertService } from '../services/alertService';
import { getAlertTypeConfig } from '../utils/categoryConfig';
import { getRelativeTime } from '../utils/formatters';
import { useToast } from '../context/ToastContext';
import './AlertsPage.css';

export default function AlertsPage() {
    const toast = useToast();
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All');
    const filters = ['All', 'Upcoming', 'Overspending', 'Duplicates', 'Info'];

    const fetchAlerts = async () => {
        try {
            setLoading(true);
            const res = await alertService.getAlerts();
            setAlerts(res.data.data.alerts);
        } catch (err) {
            console.error('Failed to fetch alerts', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlerts();
    }, []);

    const filtered = alerts.filter(a => {
        if (filter === 'All') return true;
        if (filter === 'Upcoming') return a.type === 'upcoming';
        if (filter === 'Overspending') return a.type === 'overspending';
        if (filter === 'Duplicates') return a.type === 'duplicate';
        if (filter === 'Info') return a.type === 'info' || a.type === 'savings';
        return true;
    });

    const markAllRead = async () => {
        try {
            await alertService.markAllRead();
            setAlerts(prev => prev.map(a => ({ ...a, isRead: true })));
            toast.success('All alerts marked as read');
        } catch (err) {
            toast.error('Failed to mark alerts as read');
        }
    };

    const dismissAlert = async (id) => {
        try {
            await alertService.dismissAlert(id);
            setAlerts(prev => prev.filter(a => a._id !== id));
            toast.success('Alert dismissed');
        } catch (err) {
            toast.error('Failed to dismiss alert');
        }
    };

    return (
        <div className="page-enter">
            {/* Header */}
            <div className="alerts-header">
                <div>
                    <h2>Alerts &amp; Notifications</h2>
                    <p className="alerts-header__sub">Stay ahead of your bills and unusual spending</p>
                </div>
                <Button variant="ghost" size="md" onClick={markAllRead}>Mark All Read</Button>
            </div>

            {/* Filter Pills */}
            <div className="alerts-filters">
                {filters.map(f => (
                    <button
                        key={f}
                        className={`alerts-filter ${filter === f ? 'alerts-filter--active' : ''}`}
                        onClick={() => setFilter(f)}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* Timeline */}
            {loading ? (
                <EmptyState
                    icon={<CheckCircle size={28} />}
                    title="Loading alerts..."
                    description="Please wait while we fetch your notifications."
                />
            ) : filtered.length === 0 ? (
                <EmptyState
                    icon={<CheckCircle size={28} />}
                    title="You're all clear!"
                    description="No alerts right now. We'll notify you when something needs attention."
                />
            ) : (
                <div className="alerts-timeline">
                    <div className="alerts-timeline__line" />
                    {filtered.map(alert => {
                        const config = getAlertTypeConfig(alert.type);
                        const Icon = config.icon;
                        return (
                            <div key={alert._id} className={`alerts-card ${!alert.isRead ? 'alerts-card--unread' : ''}`} style={{ borderLeftColor: config.borderColor }}>
                                {/* Timeline dot */}
                                <div className="alerts-timeline__dot" style={{ background: config.color }} />

                                <div className="alerts-card__header">
                                    <div className="alerts-card__type">
                                        <div className="alerts-card__icon" style={{ background: config.color + '20', color: config.color }}>
                                            <Icon size={14} />
                                        </div>
                                        <span className="alerts-card__type-label">{config.label}</span>
                                    </div>
                                    <span className="alerts-card__time mono">{getRelativeTime(alert.createdAt)}</span>
                                </div>

                                <p className="alerts-card__message">{alert.message}</p>

                                <div className="alerts-card__actions">
                                    {alert.billId && (
                                        <Button variant="ghost" size="sm">Review Bill</Button>
                                    )}
                                    <Button variant="text" size="sm" onClick={() => dismissAlert(alert._id)}>Dismiss</Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
