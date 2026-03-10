/**
 * Format a number as Indian Rupee currency
 * @param {number} amount
 * @returns {string} e.g. "₹3,517"
 */
export function formatCurrency(amount) {
  return '₹' + amount.toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  });
}

/**
 * Format a date string to readable format
 * @param {string} dateStr - ISO date string or YYYY-MM-DD
 * @returns {string} e.g. "Mar 7, 2026"
 */
export function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a date string to short format
 * @param {string} dateStr
 * @returns {string} e.g. "Mar 7"
 */
export function formatDateShort(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a percentage with sign
 * @param {number} value
 * @returns {string} e.g. "+8%" or "-3%"
 */
export function formatPercentage(value) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value}%`;
}

/**
 * Format month-year
 * @param {number} month - 0-indexed
 * @param {number} year
 * @returns {string} e.g. "March 2026"
 */
export function formatMonthYear(month, year) {
  const date = new Date(year, month);
  return date.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Get relative time description
 * @param {string} dateStr
 * @returns {string} e.g. "2 hours ago"
 */
export function getRelativeTime(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDateShort(dateStr);
}
