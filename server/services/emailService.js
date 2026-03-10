const createTransporter = require('../config/email');

/**
 * Send an upcoming bill due reminder email.
 */
const sendBillReminder = async (user, bill, daysUntil) => {
    try {
        const transporter = createTransporter();
        await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: user.email,
            subject: `⏰ Your ${bill.name} is due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''} — SpendLens`,
            html: buildBillReminderHTML(user.name, bill, daysUntil),
        });
        console.log(`📧 Bill reminder sent to ${user.email} for ${bill.name}`);
    } catch (err) {
        console.error(`📧 Email send failed for ${user.email}:`, err.message);
        // Don't throw — email failure should never crash the alert system
    }
};

/**
 * Send an overspending alert email.
 */
const sendOverspendingAlert = async (user, currentAmount, averageAmount, percentIncrease) => {
    try {
        const transporter = createTransporter();
        await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: user.email,
            subject: `⚠️ Your spending is up ${percentIncrease}% this month — SpendLens`,
            html: buildOverspendingHTML(user.name, currentAmount, averageAmount, percentIncrease),
        });
        console.log(`📧 Overspending alert sent to ${user.email}`);
    } catch (err) {
        console.error(`📧 Email send failed for ${user.email}:`, err.message);
    }
};

function buildBillReminderHTML(name, bill, daysUntil) {
    return `
    <div style="font-family: 'DM Sans', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #1A1B1E; color: #E4E4E7; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 28px; font-weight: 700; color: #E8C547; font-family: 'Syne', sans-serif;">SpendLens</span>
      </div>
      <h2 style="margin: 0 0 8px; font-size: 20px; color: #F4F4F5;">Hey ${name} 👋</h2>
      <p style="color: #A1A1AA; margin: 0 0 24px;">Just a heads up — you have a bill coming due.</p>
      <div style="background: #27272A; border-radius: 8px; padding: 20px; border-left: 3px solid #E8C547;">
        <p style="margin: 0 0 4px; font-size: 18px; font-weight: 600; color: #F4F4F5;">${bill.name}</p>
        <p style="margin: 0 0 12px; color: #A1A1AA;">Due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}</p>
        <p style="margin: 0; font-size: 24px; font-weight: 700; color: #E8C547; font-family: 'JetBrains Mono', monospace;">₹${bill.amount.toLocaleString('en-IN')}</p>
      </div>
      <p style="color: #71717A; font-size: 12px; margin-top: 24px; text-align: center;">You're receiving this because bill reminders are enabled in your SpendLens settings.</p>
    </div>
  `;
}

function buildOverspendingHTML(name, currentAmount, averageAmount, percentIncrease) {
    return `
    <div style="font-family: 'DM Sans', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #1A1B1E; color: #E4E4E7; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 28px; font-weight: 700; color: #E8C547; font-family: 'Syne', sans-serif;">SpendLens</span>
      </div>
      <h2 style="margin: 0 0 8px; font-size: 20px; color: #F4F4F5;">Spending Alert ⚠️</h2>
      <p style="color: #A1A1AA; margin: 0 0 24px;">Your spending this month is higher than usual.</p>
      <div style="background: #27272A; border-radius: 8px; padding: 20px; border-left: 3px solid #EF4444;">
        <p style="margin: 0 0 8px; color: #A1A1AA;">This month so far</p>
        <p style="margin: 0 0 16px; font-size: 28px; font-weight: 700; color: #EF4444; font-family: 'JetBrains Mono', monospace;">₹${currentAmount.toLocaleString('en-IN')}</p>
        <p style="margin: 0 0 4px; color: #A1A1AA;">3-month average: ₹${averageAmount.toLocaleString('en-IN')}</p>
        <p style="margin: 0; color: #EF4444; font-weight: 600;">↑ ${percentIncrease}% increase</p>
      </div>
      <p style="color: #71717A; font-size: 12px; margin-top: 24px; text-align: center;">You're receiving this because overspending alerts are enabled in your SpendLens settings.</p>
    </div>
  `;
}

module.exports = { sendBillReminder, sendOverspendingAlert };
