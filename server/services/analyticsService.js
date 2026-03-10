const { query } = require('../config/db');

/**
 * Full spending summary for dashboard hero card.
 * ONLY reads from transactions (paid-only rule).
 */
const getSpendingSummary = async (userId, monthlyBudget) => {
    // Current month total (paid only)
    const thisMonthRes = await query(
        `SELECT COALESCE(SUM(t.amount), 0) as total
         FROM transactions t
         WHERE t.user_id = $1
           AND date_trunc('month', t.paid_date) = date_trunc('month', NOW())`,
        [userId]
    );
    const totalThisMonth = parseFloat(thisMonthRes.rows[0].total);

    // Last month total
    const lastMonthRes = await query(
        `SELECT COALESCE(SUM(t.amount), 0) as total
         FROM transactions t
         WHERE t.user_id = $1
           AND date_trunc('month', t.paid_date) = date_trunc('month', NOW() - INTERVAL '1 month')`,
        [userId]
    );
    const totalLastMonth = parseFloat(lastMonthRes.rows[0].total);

    // Month-over-month change
    const changeAmount = totalThisMonth - totalLastMonth;
    const monthOverMonthChange = totalLastMonth > 0
        ? Math.round((changeAmount / totalLastMonth) * 100)
        : 0;

    // Budget status
    const budget = parseFloat(monthlyBudget) || 0;
    const budgetUsedPercent = budget > 0 ? Math.round((totalThisMonth / budget) * 100) : 0;
    let budgetStatus = 'under';
    if (budgetUsedPercent >= 100) budgetStatus = 'exceeded';
    else if (budgetUsedPercent >= 80) budgetStatus = 'near-limit';

    // Upcoming count (next 7 days)
    const upcomingRes = await query(
        `SELECT COUNT(*), MIN(s.due_date) as next_due,
                (SELECT b.title FROM bills b JOIN bill_schedules ss ON ss.bill_id = b.bill_id
                 WHERE ss.user_id = $1 AND ss.status = 'pending' AND ss.due_date >= CURRENT_DATE
                 ORDER BY ss.due_date ASC LIMIT 1) as next_bill_title
         FROM bill_schedules s
         WHERE s.user_id = $1
           AND s.status = 'pending'
           AND s.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'`,
        [userId]
    );
    const upcomingBills = parseInt(upcomingRes.rows[0].count, 10);
    const nextBill = upcomingRes.rows[0].next_due
        ? { name: upcomingRes.rows[0].next_bill_title, dueDate: upcomingRes.rows[0].next_due }
        : null;

    return {
        totalThisMonth,
        totalLastMonth,
        changeAmount,
        monthOverMonthChange,
        budget,
        budgetUsedPercent,
        budgetStatus,
        upcomingBills,
        nextBill,
    };
};

/**
 * Monthly spending breakdown by category (for current or specified month).
 */
const getCategoryBreakdown = async (userId, year, month) => {
    const res = await query(
        `SELECT c.category_name as category,
                COALESCE(SUM(t.amount), 0)::numeric(12,2) as amount,
                COUNT(t.transaction_id) as count
         FROM transactions t
         JOIN bill_schedules s ON s.schedule_id = t.schedule_id
         JOIN bills b ON b.bill_id = s.bill_id
         LEFT JOIN categories c ON c.category_id = b.category_id
         WHERE t.user_id = $1
           AND EXTRACT(YEAR FROM t.paid_date) = $2
           AND EXTRACT(MONTH FROM t.paid_date) = $3
         GROUP BY c.category_name
         ORDER BY amount DESC`,
        [userId, year, month]
    );

    const rows = res.rows.map(r => ({ ...r, amount: parseFloat(r.amount) }));
    const total = rows.reduce((s, r) => s + r.amount, 0);
    return rows.map(r => ({
        ...r,
        percentage: total > 0 ? Math.round((r.amount / total) * 100) : 0,
    }));
};

/**
 * 12-month year-to-date spending trend (one data point per month).
 * Reads only from transactions.
 */
const getMonthlyTrend = async (userId, months = 12) => {
    const res = await query(
        `SELECT to_char(date_trunc('month', t.paid_date), 'YYYY-MM') as month,
                COALESCE(SUM(t.amount), 0)::numeric(12,2) as amount
         FROM transactions t
         WHERE t.user_id = $1
           AND t.paid_date >= NOW() - ($2 || ' months')::interval
         GROUP BY date_trunc('month', t.paid_date)
         ORDER BY date_trunc('month', t.paid_date) ASC`,
        [userId, months]
    );
    return res.rows.map(r => ({ month: r.month, amount: parseFloat(r.amount) }));
};

/**
 * Generate intelligent insights comparing this month vs last month per category.
 */
const getInsights = async (userId) => {
    const insights = [];

    // Category delta
    const deltaRes = await query(
        `WITH this_month AS (
            SELECT c.category_name, SUM(t.amount) as amount
            FROM transactions t
            JOIN bill_schedules s ON s.schedule_id = t.schedule_id
            JOIN bills b ON b.bill_id = s.bill_id
            LEFT JOIN categories c ON c.category_id = b.category_id
            WHERE t.user_id = $1
              AND date_trunc('month', t.paid_date) = date_trunc('month', NOW())
            GROUP BY c.category_name
         ),
         last_month AS (
            SELECT c.category_name, SUM(t.amount) as amount
            FROM transactions t
            JOIN bill_schedules s ON s.schedule_id = t.schedule_id
            JOIN bills b ON b.bill_id = s.bill_id
            LEFT JOIN categories c ON c.category_id = b.category_id
            WHERE t.user_id = $1
              AND date_trunc('month', t.paid_date) = date_trunc('month', NOW() - INTERVAL '1 month')
            GROUP BY c.category_name
         )
         SELECT tm.category_name,
                tm.amount as this_amt,
                COALESCE(lm.amount,0) as last_amt,
                ROUND(((tm.amount - COALESCE(lm.amount,0)) / NULLIF(COALESCE(lm.amount,0),0)) * 100) as pct_change
         FROM this_month tm
         LEFT JOIN last_month lm USING (category_name)
         WHERE COALESCE(lm.amount,0) > 0
           AND ((tm.amount - COALESCE(lm.amount,0)) / lm.amount) > 0.20
         ORDER BY pct_change DESC`,
        [userId]
    );

    for (const row of deltaRes.rows) {
        insights.push({
            type: 'category_increase',
            message: `${row.category_name} spending is up ${row.pct_change}% vs last month (₹${parseFloat(row.this_amt).toLocaleString('en-IN')} vs ₹${parseFloat(row.last_amt).toLocaleString('en-IN')}).`,
        });
    }

    // Upcoming bills in next 7 days
    const upcomingRes = await query(
        `SELECT COUNT(*) as cnt FROM bill_schedules
         WHERE user_id = $1 AND status = 'pending'
           AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'`,
        [userId]
    );
    const cnt = parseInt(upcomingRes.rows[0].cnt, 10);
    if (cnt > 0) {
        insights.push({
            type: 'upcoming',
            message: `You have ${cnt} bill${cnt > 1 ? 's' : ''} due in the next 7 days.`,
        });
    }

    return insights;
};

/**
 * Recurring bill cost breakdown normalized to monthly amount.
 */
const getSubscriptionCosts = async (userId) => {
    const res = await query(
        `SELECT b.bill_id as id,
                b.title as name,
                b.frequency,
                b.amount::numeric(12,2) as amount,
                COALESCE(c.category_name, 'Other') as category
         FROM bills b
         LEFT JOIN categories c ON c.category_id = b.category_id
         WHERE b.user_id = $1
           AND b.is_deleted = FALSE
           AND b.frequency <> 'one-time'
         ORDER BY b.amount DESC, b.created_at DESC`,
        [userId]
    );

    const normalized = res.rows.map((row) => {
        const amount = parseFloat(row.amount) || 0;
        let normalizedMonthly = amount;
        if (row.frequency === 'weekly') normalizedMonthly = amount * (52 / 12);
        else if (row.frequency === 'quarterly') normalizedMonthly = amount / 3;
        else if (row.frequency === 'yearly') normalizedMonthly = amount / 12;
        else if (row.frequency === 'custom') normalizedMonthly = amount;

        return {
            id: row.id,
            name: row.name,
            frequency: row.frequency,
            amount,
            category: row.category,
            normalizedMonthly: Math.round(normalizedMonthly * 100) / 100,
        };
    });

    return normalized;
};

module.exports = { getSpendingSummary, getCategoryBreakdown, getMonthlyTrend, getInsights, getSubscriptionCosts };
