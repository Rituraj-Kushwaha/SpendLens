import { useState } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { TrendingUp, ArrowRight } from 'lucide-react';
import { useEffect } from 'react';
import { analyticsService } from '../services/analyticsService';
import { getCategoryColor, CATEGORIES } from '../utils/categoryConfig';
import { useCurrency } from '../context/CurrencyContext';
import './AnalyticsPage.css';

const DONUT_COLORS = Object.keys(CATEGORIES).map(c => getCategoryColor(c));

/**
 * Generates smart, data-driven insights from the user's real spending data.
 */
function generateInsights(trend, categoryBreakdown, subscriptionCosts, fc) {
    const insights = [];

    // Insight 1: Biggest spending category
    if (categoryBreakdown.length > 0) {
        const top = categoryBreakdown[0];
        insights.push({
            color: 'var(--accent-main)',
            icon: '📊',
            title: `Top Category: ${top.category}`,
            desc: `${top.category} is your biggest expense this month at ${fc(top.amount)} (${top.percentage}% of total spending).`,
        });
    }

    // Insight 2: Month-over-month spending trend
    if (trend.length >= 2) {
        const last = trend[trend.length - 1];
        const prev = trend[trend.length - 2];
        if (prev.amount > 0 && last.amount > 0) {
            const change = Math.round(((last.amount - prev.amount) / prev.amount) * 100);
            if (change > 10) {
                insights.push({
                    color: 'var(--accent-red)',
                    icon: '⚠',
                    title: 'Spending Increased',
                    desc: `Your spending in ${last.month} is up ${change}% compared to ${prev.month} (${fc(prev.amount)} → ${fc(last.amount)}).`,
                });
            } else if (change < -10) {
                insights.push({
                    color: 'var(--accent-green)',
                    icon: '✅',
                    title: 'Spending Decreased',
                    desc: `Great job! Your spending in ${last.month} dropped by ${Math.abs(change)}% compared to ${prev.month}.`,
                });
            } else {
                insights.push({
                    color: 'var(--accent-blue)',
                    icon: '📈',
                    title: 'Stable Spending',
                    desc: `Your spending stayed consistent between ${prev.month} and ${last.month} — a ${change > 0 ? '+' : ''}${change}% change.`,
                });
            }
        }
    }

    // Insight 3: Subscription awareness
    if (subscriptionCosts.length > 0) {
        const totalSubs = subscriptionCosts.reduce((s, c) => s + (c.normalizedMonthly || c.amount), 0);
        insights.push({
            color: 'var(--accent-blue)',
            icon: '🔁',
            title: `${subscriptionCosts.length} Active Subscription${subscriptionCosts.length > 1 ? 's' : ''}`,
            desc: `You have ${subscriptionCosts.length} recurring bill${subscriptionCosts.length > 1 ? 's' : ''} totalling ${fc(totalSubs)}/month. Review them regularly to avoid billing for unused services.`,
        });
    }

    // Insight 4: No data yet
    if (insights.length === 0) {
        insights.push({
            color: 'var(--text-muted)',
            icon: '💡',
            title: 'No Data Yet',
            desc: 'Add your bills to start seeing personalised insights about your spending habits.',
        });
    }

    return insights;
}

export default function AnalyticsPage() {
    const { formatCurrency: fc } = useCurrency();
    const [dateRange, setDateRange] = useState('6months');
    const [loading, setLoading] = useState(true);
    const [trend, setTrend] = useState([]);
    const [categoryBreakdown, setCategoryBreakdown] = useState([]);
    const [subscriptionCosts, setSubscriptionCosts] = useState([]);

    // Compute trend date label dynamically
    const trendDateLabel = (() => {
        const now = new Date();
        const months = dateRange === '1month' ? 1 : dateRange === '3months' ? 3 : dateRange === '6months' ? 6 : 12;
        const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${monthNames[start.getMonth()]} ${start.getFullYear()} – ${monthNames[now.getMonth()]} ${now.getFullYear()}`;
    })();

    useEffect(() => {
        const fetchAnalytics = async () => {
            setLoading(true);
            try {
                const months = dateRange === '1month' ? 1 : dateRange === '3months' ? 3 : dateRange === '6months' ? 6 : 12;
                // Compute the month string for the last month in the window
                const now = new Date();
                const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                const [trendRes, catRes, subRes] = await Promise.all([
                    analyticsService.getMonthlyTrend(months),
                    analyticsService.getCategoryBreakdown(monthStr),
                    analyticsService.getSubscriptionCosts()
                ]);
                setTrend(trendRes.data.data.trend);
                setCategoryBreakdown(catRes.data.data.breakdown);
                setSubscriptionCosts(subRes.data.data.subscriptions);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, [dateRange]);

    const totalSpend = categoryBreakdown.reduce((s, c) => s + c.amount, 0);
    // Use normalizedMonthly so all frequencies are comparable
    const totalSubs = subscriptionCosts.reduce((s, c) => s + (c.normalizedMonthly ?? c.amount), 0);
    const maxSubAmount = subscriptionCosts.length > 0
        ? Math.max(...subscriptionCosts.map(c => c.normalizedMonthly ?? c.amount))
        : 1;

    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null;
        return (
            <div className="chart-tooltip">
                <span className="chart-tooltip__label">{label}</span>
                {payload.map((p, i) => (
                    <span key={i} className="chart-tooltip__value mono" style={{ color: p.color }}>
                        {fc(p.value)}
                    </span>
                ))}
            </div>
        );
    };

    return (
        <div className="page-enter">
            {/* Header */}
            <div className="analytics-header">
                <div>
                    <h2>Analytics</h2>
                    <p className="analytics-header__sub">Actual spending — based on bills you've paid</p>
                </div>
                <select
                    className="analytics-range-select"
                    value={dateRange}
                    onChange={e => setDateRange(e.target.value)}
                >
                    <option value="1month">This Month</option>
                    <option value="3months">Last 3 Months</option>
                    <option value="6months">Last 6 Months</option>
                    <option value="1year">This Year</option>
                </select>
            </div>

            <div className="analytics-grid stagger-children">
                {/* Monthly Trend */}
                <div className="card analytics-trend">
                    <h4>Monthly Spending (Paid Bills)</h4>
                    <p className="analytics-sub">{trendDateLabel} · amounts paid each month</p>
                    <div className="analytics-chart-area">
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={trend}>
                                <defs>
                                    <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#E8C547" stopOpacity={0.3} />
                                        <stop offset="100%" stopColor="#E8C547" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" vertical={false} />
                                <XAxis
                                    dataKey="month"
                                    tick={{ fontFamily: 'JetBrains Mono', fontSize: 12, fill: 'var(--text-secondary)' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    tickFormatter={v => `₹${(v / 1000).toFixed(1)}k`}
                                    tick={{ fontFamily: 'JetBrains Mono', fontSize: 12, fill: 'var(--text-secondary)' }}
                                    axisLine={false}
                                    tickLine={false}
                                    width={55}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="amount" stroke="#E8C547" strokeWidth={2} fill="url(#trendGrad)" name="This Year" />
                                <Area type="monotone" dataKey="lastYear" stroke="#5B8FE8" strokeWidth={1.5} fill="transparent" strokeDasharray="4 4" name="Last Year" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Donut Chart */}
                <div className="card analytics-donut">
                    <h4>Spending by Category</h4>
                    <div className="analytics-donut__chart">
                        <ResponsiveContainer width="100%" height={240}>
                            <PieChart>
                                <Pie
                                    data={categoryBreakdown}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={65}
                                    outerRadius={95}
                                    dataKey="amount"
                                    nameKey="category"
                                    stroke="none"
                                >
                                    {categoryBreakdown.map((entry, i) => (
                                        <Cell key={i} fill={getCategoryColor(entry.category)} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="analytics-donut__center">
                            <span className="analytics-donut__center-label">Total</span>
                            <span className="analytics-donut__center-value mono display-font">{fc(totalSpend)}</span>
                        </div>
                    </div>
                    <div className="analytics-legend">
                        {categoryBreakdown.map(cat => (
                            <div key={cat.category} className="analytics-legend__item">
                                <span className="analytics-legend__dot" style={{ background: getCategoryColor(cat.category) }} />
                                <span className="analytics-legend__name">{cat.category}</span>
                                <span className="analytics-legend__amount mono">{fc(cat.amount)}</span>
                                <span className="analytics-legend__pct mono">{cat.percentage}%</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Subscription Breakdown */}
                <div className="card analytics-subs">
                    <h4>Subscription Costs</h4>
                    <div className="analytics-subs__list">
                        {subscriptionCosts.map((sub, idx) => {
                            const catColor = getCategoryColor(sub.category);
                            const monthlyAmt = sub.normalizedMonthly ?? sub.amount;
                            const barPct = maxSubAmount > 0 ? (monthlyAmt / maxSubAmount) * 100 : 0;
                            // Pick a unique hue per subscription if category color same
                            const hueShift = idx * 37;
                            const barColor = catColor;
                            return (
                                <div key={sub.id ?? sub.name} className="analytics-sub-row">
                                    <span className="analytics-sub-row__name">{sub.name}</span>
                                    <div className="analytics-sub-row__bar-wrap">
                                        <div
                                            className="analytics-sub-row__bar"
                                            style={{
                                                width: `${Math.max(barPct, 4)}%`,
                                                background: `linear-gradient(90deg, ${barColor}cc, ${barColor})`,
                                                boxShadow: `0 0 8px ${barColor}55`,
                                            }}
                                        />
                                    </div>
                                    <span
                                        className="analytics-sub-row__amount mono"
                                        style={{ color: barColor }}
                                    >{fc(monthlyAmt)}/mo</span>
                                </div>
                            );
                        })}
                        <div className="analytics-subs__total">
                            <span>Total Subscriptions</span>
                            <span className="mono" style={{ color: 'var(--accent-main)' }}>{fc(totalSubs)}/month</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Insights Panel */}
            <div className="analytics-insights">
                <h4 className="analytics-insights__title">Smart Insights</h4>
                <div className="analytics-insights__grid stagger-children">
                    {generateInsights(trend, categoryBreakdown, subscriptionCosts, fc).map((insight, i) => (
                        <div key={i} className="card analytics-insight-card" style={{ borderLeft: `4px solid ${insight.color}` }}>
                            <div className="analytics-insight-card__header">
                                <span className="analytics-insight-card__icon">{insight.icon}</span>
                                <span className="analytics-insight-card__title">{insight.title}</span>
                            </div>
                            <p className="analytics-insight-card__desc">{insight.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
