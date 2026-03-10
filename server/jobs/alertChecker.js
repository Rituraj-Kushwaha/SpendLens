const cron = require('node-cron');
const { query } = require('../config/db');
const scheduleService = require('../services/scheduleService');
const notificationService = require('../services/notificationService');
const billService = require('../services/billService');

/**
 * Daily alert checker — runs at ALERT_CHECK_CRON (default: 8 AM UTC).
 * 1. Mark overdue schedules
 * 2. Create notifications for bills due in 3 days, 1 day, or today
 * 3. Send email reminders (if configured)
 * 4. Top up infinite-tenure monthly bill schedules (< 3 remain)
 */
const initAlertChecker = () => {
    const cronExpression = process.env.ALERT_CHECK_CRON || '0 8 * * *';

    cron.schedule(cronExpression, async () => {
        console.log(`⏰ Alert checker running at ${new Date().toISOString()}`);
        try {
            // 1. Mark overdue
            const overdue = await scheduleService.markOverdueSchedules();
            if (overdue.length) console.log(`  → Marked ${overdue.length} schedules as overdue`);

            // 2. Upcoming reminders — find schedules due in exactly 1 or 3 days, or today
            const reminderRes = await query(
                `SELECT s.schedule_id, s.user_id, s.due_date,
                        b.title, b.amount,
                        (s.due_date - CURRENT_DATE) AS days_until
                 FROM bill_schedules s
                 JOIN bills b ON b.bill_id = s.bill_id
                 WHERE s.status = 'pending'
                   AND (s.due_date - CURRENT_DATE) IN (0, 1, 3)`
            );

            for (const row of reminderRes.rows) {
                const dueDays = parseInt(row.days_until, 10);
                const when = dueDays === 0 ? 'today' : `in ${dueDays} day${dueDays > 1 ? 's' : ''}`;
                const message = `${row.title} (₹${parseFloat(row.amount).toLocaleString('en-IN')}) is due ${when}.`;

                // Check if we already notified for this schedule recently (dedup)
                const existing = await query(
                    `SELECT 1 FROM notifications
                     WHERE schedule_id = $1 AND created_at > NOW() - INTERVAL '20 hours'`,
                    [row.schedule_id]
                );
                if (existing.rowCount === 0) {
                    await notificationService.createNotification(row.user_id, row.schedule_id, message);
                }
            }

            // 3. Top up infinite-tenure recurring bills with < 3 pending schedules
            const infiniteBillsRes = await query(
                `SELECT b.*
                 FROM bills b
                 WHERE b.tenure IS NULL
                   AND b.frequency != 'one-time'
                   AND b.is_deleted = FALSE`
            );

            for (const bill of infiniteBillsRes.rows) {
                const pendingCount = await scheduleService.countPendingForBill(bill.bill_id);
                if (pendingCount < 3) {
                    // Find latest scheduled date
                    const latestRes = await query(
                        `SELECT MAX(due_date) as latest FROM bill_schedules WHERE bill_id = $1`,
                        [bill.bill_id]
                    );
                    const latestDate = latestRes.rows[0].latest;
                    if (latestDate) {
                        // Generate 6 more from latest date
                        const fakeBill = { ...bill, bill_date: latestDate };
                        const tempBill = { ...fakeBill };

                        // Advance one period from latest existing
                        const d = new Date(latestDate);
                        if (bill.frequency === 'weekly') d.setDate(d.getDate() + 7);
                        else if (bill.frequency === 'monthly') d.setMonth(d.getMonth() + 1);
                        else if (bill.frequency === 'quarterly') d.setMonth(d.getMonth() + 3);
                        else if (bill.frequency === 'yearly') d.setFullYear(d.getFullYear() + 1);
                        else if (bill.frequency === 'custom') d.setDate(d.getDate() + (bill.interval_days || 1));

                        tempBill.bill_date = d.toISOString().slice(0, 10);
                        tempBill.tenure = 6; // generate 6 more
                        await scheduleService.generateSchedules(tempBill);
                        console.log(`  → Topped up schedules for bill: ${bill.title}`);
                    }
                }
            }

            console.log(`✅ Alert checker completed`);
        } catch (err) {
            console.error('❌ Alert checker error:', err.message);
        }
    });

    console.log(`📋 Alert checker scheduled: ${cronExpression}`);
};

module.exports = { initAlertChecker };
