import { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, AlertTriangle, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import Badge from '../components/Badge';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';
import { analyticsService } from '../services/analyticsService';
import { billService } from '../services/billService';
import { formatDateShort } from '../utils/formatters';
import { Link } from 'react-router-dom';
import './DashboardPage.css';

function daysUntil(dateStr) {
    if (!dateStr) return null;
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const d = new Date(dateStr); d.setHours(0, 0, 0, 0);
    return Math.round((d - now) / 86400000);
}

export default function DashboardPage() {
    const { formatCurrency: fc } = useCurrency();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState(null);
    const [trend, setTrend] = useState([]);
    const [pending, setPending] = useState([]);
    const [paid, setPaid] = useState([]);
    const [monthOffset, setMonthOffset] = useState(0);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [sumRes, trendRes, dashRes] = await Promise.all([
                    analyticsService.getSummary(),
                    analyticsService.getMonthlyTrend(6),
                    billService.getDashboardSchedules(),
                ]);
                setSummary(sumRes.data.data);
                setTrend(trendRes.data.data.trend || []);
                setPending(dashRes.data.data.pending || []);
                setPaid(dashRes.data.data.paidThisMonth || []);
            } catch (err) {
                console.error('Dashboard load error:', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [monthOffset]);

    const { totalThisMonth = 0, budget = 0, budgetUsedPercent = 0, budgetStatus = 'under',
        upcomingBills = 0, nextBill = null, monthOverMonthChange = 0, changeAmount = 0 } = summary || {};

    const progressColor = budgetStatus === 'exceeded' ? 'var(--accent-red)'
        : budgetStatus === 'near-limit' ? 'var(--accent-amber, #f59e0b)' : 'var(--accent-green)';

    const overdueList = pending.filter(s => s.status === 'overdue' || daysUntil(s.due_date) < 0);
    const upcomingList = pending.filter(s => s.status !== 'overdue' && daysUntil(s.due_date) >= 0);

    if (loading) return <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Loading dashboard...</div>;

    return (
        <div className="page-enter">
            <div className="dash-header">
                <div className="dash-header__left">
                    <h2 className="dash-header__greeting">
                        Hey, <span className="text-accent">{user?.name?.split(' ')[0]}</span> 👋
                    </h2>
                    <p className="dash-header__sub">Here's your spending snapshot</p>
                </div>
            </div>

            {/* ── Section 1: Spending Overview ─────────────────────────────── */}
            <div className="dash-grid stagger-children">
                <div className="card card-hover dash-hero">
                    <div className="dash-hero__main">
                        <div className="dash-hero__left">
                            <span className="dash-hero__amount mono display-font">{fc(totalThisMonth)}</span>
                            <span className="dash-hero__label">Total Spent This Month</span>
                            <div className="dash-hero__progress">
                                {budget > 0 ? (
                                    <>
                                        <div className="dash-hero__progress-track">
                                            <div className="dash-hero__progress-fill"
                                                style={{ width: `${Math.min(budgetUsedPercent, 100)}%`, background: progressColor }} />
                                        </div>
                                        <span className="dash-hero__progress-label mono">
                                            {budgetUsedPercent}% of {fc(budget)} budget —{' '}
                                            <span style={{ color: progressColor, fontWeight: 700 }}>
                                                {budgetStatus === 'exceeded' ? 'EXCEEDED' : budgetStatus === 'near-limit' ? 'Near Limit' : 'On Track'}
                                            </span>
                                        </span>
                                        <span className="dash-hero__progress-label mono" style={{ color: 'var(--text-muted)' }}>
                                            {fc(Math.max(0, budget - totalThisMonth))} remaining
                                        </span>
                                    </>
                                ) : (
                                    <span className="dash-hero__progress-label mono" style={{ color: 'var(--text-muted)' }}>
                                        No budget set — <Link to="/settings" style={{ color: 'var(--accent-main)' }}>Set one →</Link>
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="dash-hero__chart">
                            <ResponsiveContainer width="100%" height={80}>
                                <AreaChart data={trend}>
                                    <defs>
                                        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#E8C547" stopOpacity={0.3} />
                                            <stop offset="100%" stopColor="#E8C547" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Area type="monotone" dataKey="amount" stroke="#E8C547" strokeWidth={2} fill="url(#sparkGrad)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Stat cards */}
                <div className="card card-hover dash-stat">
                    <div className="dash-stat__icon dash-stat__icon--amber"><Calendar size={20} /></div>
                    <span className="dash-stat__label">Due This Week</span>
                    <span className="dash-stat__value display-font">{upcomingBills}</span>
                    <span className="dash-stat__sub mono">{nextBill ? `Next: ${nextBill.name}` : 'None upcoming'}</span>
                </div>

                <div className="card card-hover dash-stat">
                    <div className={`dash-stat__icon ${monthOverMonthChange > 0 ? 'dash-stat__icon--red' : 'dash-stat__icon--green'}`}>
                        {monthOverMonthChange > 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                    </div>
                    <span className="dash-stat__label">vs Last Month</span>
                    <span className={`dash-stat__value display-font ${monthOverMonthChange > 0 ? 'text-red' : 'text-green'}`}>
                        {monthOverMonthChange > 0 ? '+' : ''}{monthOverMonthChange}%
                    </span>
                    <span className="dash-stat__sub mono">{fc(Math.abs(changeAmount))} {monthOverMonthChange > 0 ? 'more' : 'less'}</span>
                </div>
            </div>

            {/* ── Section 2: Paid Bills This Month ─────────────────────────── */}
            <div className="card dash-recent" style={{ marginTop: '1.5rem' }}>
                <div className="dash-recent__header">
                    <h4>Paid Bills This Month</h4>
                    <Link to="/bills?tab=paid" className="dash-recent__link">View All →</Link>
                </div>
                {paid.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <CheckCircle size={32} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
                        <p>No bills paid yet this month. Once you mark a bill as paid, it will appear here.</p>
                    </div>
                ) : (
                    <div className="dash-recent__list">
                        {paid.map(s => (
                            <div key={s.schedule_id} className="dash-bill-row">
                                <div className="dash-bill-row__left">
                                    <div className="dash-bill-row__icon" style={{ background: 'var(--accent-green)20', color: 'var(--accent-green)' }}>
                                        <CheckCircle size={14} />
                                    </div>
                                    <div className="dash-bill-row__info">
                                        <span className="dash-bill-row__name">{s.title}</span>
                                        <span className="dash-bill-row__date mono">
                                            {s.category} · {s.paid_date ? new Date(s.paid_date).toLocaleDateString('en-IN') : ''}
                                            {s.payment_method && <> · {s.payment_method}</>}
                                        </span>
                                    </div>
                                </div>
                                <span className="dash-bill-row__amount mono">{fc(s.paid_amount || s.amount)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Section 3: Upcoming & Overdue ────────────────────────────── */}
            <div className="card dash-recent" style={{ marginTop: '1.5rem' }}>
                <div className="dash-recent__header">
                    <h4>Upcoming & Overdue</h4>
                    <Link to="/bills" className="dash-recent__link">View All →</Link>
                </div>
                {pending.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <p>You're all caught up! No pending bills.</p>
                    </div>
                ) : (
                    <div className="dash-recent__list">
                        {/* Overdue first */}
                        {overdueList.map(s => (
                            <div key={s.schedule_id} className="dash-bill-row dash-bill-row--overdue">
                                <div className="dash-bill-row__left">
                                    <div className="dash-bill-row__icon" style={{ background: 'var(--accent-red)20', color: 'var(--accent-red)' }}>
                                        <AlertTriangle size={14} />
                                    </div>
                                    <div className="dash-bill-row__info">
                                        <span className="dash-bill-row__name">{s.title}</span>
                                        <span className="dash-bill-row__date mono" style={{ color: 'var(--accent-red)' }}>
                                            Overdue by {Math.abs(daysUntil(s.due_date))} day{Math.abs(daysUntil(s.due_date)) !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                </div>
                                <span className="dash-bill-row__amount mono" style={{ color: 'var(--accent-red)' }}>{fc(s.amount)}</span>
                            </div>
                        ))}
                        {/* Upcoming */}
                        {upcomingList.slice(0, 5).map(s => {
                            const days = daysUntil(s.due_date);
                            return (
                                <div key={s.schedule_id} className="dash-bill-row">
                                    <div className="dash-bill-row__left">
                                        <div className="dash-bill-row__icon" style={{ background: 'var(--accent-main)20', color: 'var(--accent-main)' }}>
                                            <Calendar size={14} />
                                        </div>
                                        <div className="dash-bill-row__info">
                                            <span className="dash-bill-row__name">{s.title}</span>
                                            <span className="dash-bill-row__date mono">
                                                {days === 0 ? 'Due today' : `Due in ${days} day${days !== 1 ? 's' : ''}`}
                                                {s.category && <> · {s.category}</>}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="dash-bill-row__amount mono">{fc(s.amount)}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
