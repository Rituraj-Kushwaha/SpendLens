import { useState, useRef } from 'react';
import { User, Bell as BellIcon, Sliders, Shield, Database, Camera } from 'lucide-react';
import FormInput from '../components/FormInput';
import Button from '../components/Button';
import ToggleSwitch from '../components/ToggleSwitch';
import CategoryChartExport from '../components/CategoryChartExport';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useCurrency, CURRENCIES } from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { analyticsService } from '../services/analyticsService';
import './SettingsPage.css';

const settingsNav = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'notifications', label: 'Notifications', icon: BellIcon },
    { key: 'preferences', label: 'Preferences', icon: Sliders },
    { key: 'security', label: 'Security', icon: Shield },
    { key: 'data', label: 'Data & Export', icon: Database },
];

export default function SettingsPage() {
    const { theme, toggleTheme } = useTheme();
    const toast = useToast();
    const { currency, setCurrency, currencies } = useCurrency();
    const currSymbol = currencies[currency]?.symbol || '₹';
    const { user, updateUser, logout } = useAuth();
    const [activePanel, setActivePanel] = useState('profile');
    const [saving, setSaving] = useState(false);
    const [exportingChart, setExportingChart] = useState(false);
    const [categoryBreakdown, setCategoryBreakdown] = useState([]);
    const chartExportRef = useRef(null);
    const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '' });
    const [notifs, setNotifs] = useState({
        billReminders: user?.notification_prefs?.billDueReminders ?? true,
        reminderDays: String(user?.notification_prefs?.reminderDaysBefore ?? 3),
        overspending: user?.notification_prefs?.overspendingAlerts ?? true,
        weeklySummary: user?.notification_prefs?.weeklySummary ?? false,
        monthlyReport: user?.notification_prefs?.monthlyReport ?? false,
    });
    const [prefs, setPrefs] = useState({
        dateFormat: user?.date_format || 'DD/MM/YYYY',
        budget: String(user?.monthly_budget || 0),
    });

    const handleSave = async (panelOverride) => {
        setSaving(true);
        try {
            const panel = panelOverride || activePanel;
            let payload = {};
            if (panel === 'profile') {
                payload = { name: profile.name };
            } else if (panel === 'notifications') {
                payload = {
                    notification_prefs: {
                        billDueReminders: notifs.billReminders,
                        overspendingAlerts: notifs.overspending,
                        weeklySummary: notifs.weeklySummary,
                        monthlyReport: notifs.monthlyReport,
                        reminderDaysBefore: Number(notifs.reminderDays),
                    },
                };
            } else if (panel === 'preferences') {
                payload = {
                    currency,
                    theme,
                    date_format: prefs.dateFormat,
                    monthly_budget: Number(prefs.budget) || 0,
                };
            }
            const res = await api.patch('/auth/me', payload);
            updateUser(res.data.data.user);
            toast.success('Settings saved successfully!');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleExportCSV = async () => {
        try {
            const res = await analyticsService.getTransactions();
            const paidBills = res.data.data.transactions || [];
            if (!paidBills.length) { toast.error('No paid bills to export'); return; }
            const rows = paidBills.map(t => ({
                Name: t.title,
                Category: t.category || 'Other',
                Amount: t.amount,
                Frequency: t.frequency || '-',
                'Due Date': t.due_date ? new Date(t.due_date).toLocaleDateString('en-IN') : '',
                'Paid Date': t.paid_date ? new Date(t.paid_date).toLocaleDateString('en-IN') : '',
                'Payment Method': t.payment_method || '-',
                'Reference': t.payment_reference || '-',
            }));
            const headers = Object.keys(rows[0]).join(',');
            const csv = [headers, ...rows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `spendlens-paid-bills-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Paid bills exported as CSV!');
        } catch (err) {
            toast.error('Export failed. Please try again.');
        }
    };

    const handleDeleteAccount = async () => {
        const confirmed = window.confirm('Delete your account permanently? This will remove all your bills, payments, and history.');
        if (!confirmed) return;

        try {
            await api.delete('/auth/me');
            await logout();
            toast.success('Account deleted successfully');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to delete account');
        }
    };

    const handleExportCategoryChart = async () => {
        setExportingChart(true);
        try {
            // Fetch category breakdown data
            const catRes = await analyticsService.getCategoryBreakdown();
            const breakdown = catRes.data.data.breakdown;
            
            if (!breakdown || breakdown.length === 0) {
                toast.error('No spending data to export');
                setExportingChart(false);
                return;
            }

            setCategoryBreakdown(breakdown);

            // Wait for canvas to be drawn
            setTimeout(() => {
                try {
                    // Get canvas element
                    const canvas = document.querySelector('canvas[style*="display: none"]');
                    
                    if (!canvas) {
                        toast.error('Failed to generate chart');
                        setExportingChart(false);
                        setCategoryBreakdown([]);
                        return;
                    }

                    // Convert canvas to blob and download
                    canvas.toBlob((blob) => {
                        if (!blob) {
                            toast.error('Failed to generate image');
                            setExportingChart(false);
                            setCategoryBreakdown([]);
                            return;
                        }

                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `spendlens-category-spending-${new Date().toISOString().slice(0, 10)}.png`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        
                        // Cleanup
                        setTimeout(() => {
                            URL.revokeObjectURL(url);
                            toast.success('Category chart exported as image!');
                            setCategoryBreakdown([]);
                            setExportingChart(false);
                        }, 100);
                    }, 'image/png', 0.95);
                } catch (error) {
                    console.error('Chart export error:', error);
                    toast.error('Failed to export chart. Please try again.');
                    setCategoryBreakdown([]);
                    setExportingChart(false);
                }
            }, 100);
        } catch (err) {
            console.error('Export error:', err);
            toast.error('Export failed. Please try again.');
            setExportingChart(false);
        }
    };

    return (
        <div className="page-enter settings-page">
            {/* Settings Nav */}
            <div className="settings-nav">
                {settingsNav.map(item => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.key}
                            className={`settings-nav__item ${activePanel === item.key ? 'settings-nav__item--active' : ''}`}
                            onClick={() => setActivePanel(item.key)}
                        >
                            <Icon size={18} />
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Settings Panel */}
            <div className="settings-panel">
                {/* Profile */}
                {activePanel === 'profile' && (
                    <div className="settings-section">
                        <h3>Profile</h3>
                        <p className="settings-section__sub">Manage your personal information</p>

                        <div className="settings-avatar">
                            <div className="settings-avatar__circle">
                                <span>{user?.name?.charAt(0) || '?'}</span>
                            </div>
                            <div className="settings-avatar__overlay">
                                <Camera size={18} />
                            </div>
                        </div>

                        <div className="settings-form">
                            <FormInput
                                label="Full Name"
                                value={profile.name}
                                onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                            />
                            <FormInput
                                type="email"
                                label="Email Address"
                                value={profile.email}
                                onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
                            />
                            <Button variant="primary" size="md" onClick={() => handleSave()} loading={saving}>Save Changes</Button>
                        </div>

                        <div className="settings-danger">
                            <h4>Danger Zone</h4>
                            <p className="settings-danger__desc">Once you delete your account, there is no going back.</p>
                            <Button variant="danger" size="md" onClick={handleDeleteAccount}>Delete Account</Button>
                        </div>
                    </div>
                )}

                {/* Notifications */}
                {activePanel === 'notifications' && (
                    <div className="settings-section">
                        <h3>Notifications</h3>
                        <p className="settings-section__sub">Control what alerts you receive</p>

                        <div className="settings-toggles">
                            <ToggleSwitch
                                label="Bill Due Reminders"
                                checked={notifs.billReminders}
                                onChange={v => setNotifs(n => ({ ...n, billReminders: v }))}
                            />
                            {notifs.billReminders && (
                                <div className="settings-sub-option">
                                    <label className="settings-sub-label">Remind me before</label>
                                    <select
                                        className="settings-mini-select"
                                        value={notifs.reminderDays}
                                        onChange={e => setNotifs(n => ({ ...n, reminderDays: e.target.value }))}
                                    >
                                        <option value="1">1 day</option>
                                        <option value="3">3 days</option>
                                        <option value="7">7 days</option>
                                    </select>
                                </div>
                            )}
                            <ToggleSwitch
                                label="Overspending Alerts"
                                checked={notifs.overspending}
                                onChange={v => setNotifs(n => ({ ...n, overspending: v }))}
                            />
                            <ToggleSwitch
                                label="Weekly Summary Email"
                                checked={notifs.weeklySummary}
                                onChange={v => setNotifs(n => ({ ...n, weeklySummary: v }))}
                            />
                            <ToggleSwitch
                                label="Monthly Report"
                                checked={notifs.monthlyReport}
                                onChange={v => setNotifs(n => ({ ...n, monthlyReport: v }))}
                            />
                        </div>
                        <Button variant="primary" size="md" onClick={() => handleSave()} loading={saving} style={{ marginTop: 24 }}>Save Changes</Button>
                    </div>
                )}

                {/* Preferences */}
                {activePanel === 'preferences' && (
                    <div className="settings-section">
                        <h3>Preferences</h3>
                        <p className="settings-section__sub">Customize your SpendLens experience</p>

                        {/* Theme Selector */}
                        <div className="settings-field">
                            <label className="settings-field__label">Theme</label>
                            <div className="settings-theme-cards">
                                {['dark', 'light', 'system'].map(t => (
                                    <button
                                        key={t}
                                        className={`settings-theme-card ${theme === t ? 'settings-theme-card--active' : ''}`}
                                        onClick={() => {
                                            if (t === 'system') {
                                                const sys = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                                                toggleTheme();
                                            } else if (t !== theme) {
                                                toggleTheme();
                                            }
                                        }}
                                    >
                                        <div className={`settings-theme-swatch settings-theme-swatch--${t}`}>
                                            <div className="settings-theme-swatch__bar" />
                                            <div className="settings-theme-swatch__bar settings-theme-swatch__bar--short" />
                                        </div>
                                        <span>{t.charAt(0).toUpperCase() + t.slice(1)}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="settings-form">
                            <div className="settings-field">
                                <label className="settings-field__label">Currency</label>
                                <select className="settings-select" value={currency} onChange={e => setCurrency(e.target.value)}>
                                    {Object.entries(CURRENCIES).map(([code, cfg]) => (
                                        <option key={code} value={code}>{code} ({cfg.symbol}) — {cfg.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="settings-field">
                                <label className="settings-field__label">Date Format</label>
                                <select className="settings-select" value={prefs.dateFormat} onChange={e => setPrefs(p => ({ ...p, dateFormat: e.target.value }))}>
                                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                                </select>
                            </div>
                            <FormInput
                                type="number"
                                label="Default Monthly Budget"
                                prefix={currSymbol}
                                value={prefs.budget}
                                onChange={e => setPrefs(p => ({ ...p, budget: e.target.value }))}
                            />
                        </div>
                        <Button variant="primary" size="md" onClick={() => handleSave()} loading={saving} style={{ marginTop: 24 }}>Save Changes</Button>
                    </div>
                )}

                {/* Security */}
                {activePanel === 'security' && (
                    <div className="settings-section">
                        <h3>Security</h3>
                        <p className="settings-section__sub">Manage your security settings</p>
                        <div className="settings-form">
                            <FormInput type="password" label="Current Password" value="" onChange={() => { }} showToggle />
                            <FormInput type="password" label="New Password" value="" onChange={() => { }} showToggle />
                            <FormInput type="password" label="Confirm New Password" value="" onChange={() => { }} showToggle />
                            <Button variant="primary" size="md" onClick={handleSave}>Update Password</Button>
                        </div>
                    </div>
                )}

                {/* Data & Export */}
                {activePanel === 'data' && (
                    <div className="settings-section">
                        <h3>Data & Export</h3>
                        <p className="settings-section__sub">Export or manage your data</p>
                        <div className="settings-data-actions">
                            <div className="card settings-data-card">
                                <h4>Export Bills</h4>
                                <p className="settings-data-card__desc">Download all your bills as a CSV file.</p>
                                <Button variant="ghost" size="md" onClick={handleExportCSV}>Export CSV</Button>
                            </div>
                            <div className="card settings-data-card">
                                <h4>Spending by Category</h4>
                                <p className="settings-data-card__desc">Download spending breakdown chart as image.</p>
                                <Button variant="ghost" size="md" onClick={handleExportCategoryChart} loading={exportingChart}>Export Chart</Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Hidden chart export element */}
                {categoryBreakdown.length > 0 && (
                    <CategoryChartExport categoryBreakdown={categoryBreakdown} />
                )}
            </div>
        </div>
    );
}
