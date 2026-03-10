import './Badge.css';

/**
 * @param {'success'|'warning'|'danger'|'info'|'neutral'} variant
 * @param {'sm'|'md'} size
 * @param {string} label
 */
export default function Badge({ variant = 'neutral', size = 'sm', label }) {
    return (
        <span className={`badge badge--${variant} badge--${size}`}>
            {label}
        </span>
    );
}
