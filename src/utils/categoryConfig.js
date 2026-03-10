import {
    Zap, Tv, Wifi, Smartphone, Home, MoreHorizontal, Repeat as RepeatIcon,
    ShoppingCart, Car, Heart,
    AlertTriangle, Clock, Copy, TrendingDown, Info
} from 'lucide-react';

/**
 * Category configuration — colors, icons, labels
 */
export const CATEGORIES = {
    Utilities: { color: '#5B8FE8', icon: Zap, label: 'Utilities' },
    OTT: { color: '#E8C547', icon: Tv, label: 'OTT / Streaming' },
    Internet: { color: '#8B7FD4', icon: Wifi, label: 'Internet' },
    Mobile: { color: '#4BC8C8', icon: Smartphone, label: 'Mobile' },
    Rent: { color: '#E07A5F', icon: Home, label: 'Rent' },
    Subscription: { color: '#A78BFA', icon: RepeatIcon, label: 'Subscription' },
    Food: { color: '#4CAF82', icon: ShoppingCart, label: 'Food' },
    Transport: { color: '#F59E0B', icon: Car, label: 'Transport' },
    Health: { color: '#EC4899', icon: Heart, label: 'Health' },
    Other: { color: '#6B6878', icon: MoreHorizontal, label: 'Other' },
};


export function getCategoryColor(category) {
    return CATEGORIES[category]?.color || '#6B6878';
}

export function getCategoryIcon(category) {
    return CATEGORIES[category]?.icon || MoreHorizontal;
}

export function getCategoryLabel(category) {
    return CATEGORIES[category]?.label || category;
}

/**
 * Alert type configuration
 */
export const ALERT_TYPES = {
    overspending: {
        color: '#E05A5A',
        icon: AlertTriangle,
        label: 'Overspending Alert',
        borderColor: '#E05A5A',
    },
    upcoming: {
        color: '#E8C547',
        icon: Clock,
        label: 'Due Date Reminder',
        borderColor: '#E8C547',
    },
    duplicate: {
        color: '#5B8FE8',
        icon: Copy,
        label: 'Duplicate Detected',
        borderColor: '#5B8FE8',
    },
    savings: {
        color: '#4CAF82',
        icon: TrendingDown,
        label: 'Savings Opportunity',
        borderColor: '#4CAF82',
    },
    info: {
        color: '#6B6878',
        icon: Info,
        label: 'System Info',
        borderColor: '#6B6878',
    },
};

export function getAlertTypeConfig(type) {
    return ALERT_TYPES[type] || ALERT_TYPES.info;
}

/**
 * Frequency labels
 */
export const FREQUENCIES = {
    'one-time': 'One-time',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    annual: 'Annual',
};

/**
 * Status badge config
 */
export const STATUS_CONFIG = {
    paid: { variant: 'success', label: 'Paid' },
    active: { variant: 'success', label: 'Active' },
    'due-soon': { variant: 'warning', label: 'Due Soon' },
    overdue: { variant: 'danger', label: 'Overdue' },
    paused: { variant: 'neutral', label: 'Paused' },
};
