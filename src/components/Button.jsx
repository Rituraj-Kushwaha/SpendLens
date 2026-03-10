import './Button.css';

/**
 * @param {'primary'|'ghost'|'text'|'danger'} variant
 * @param {'sm'|'md'|'lg'} size
 * @param {boolean} loading
 * @param {boolean} fullWidth
 * @param {import('react').ReactNode} icon
 * @param {import('react').ReactNode} children
 */
export default function Button({
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    icon,
    children,
    ...props
}) {
    return (
        <button
            className={`btn btn--${variant} btn--${size} ${fullWidth ? 'btn--full' : ''} ${loading ? 'btn--loading' : ''}`}
            disabled={loading || props.disabled}
            {...props}
        >
            {loading ? (
                <span className="btn__spinner" />
            ) : (
                <>
                    {icon && <span className="btn__icon">{icon}</span>}
                    {children}
                </>
            )}
        </button>
    );
}
