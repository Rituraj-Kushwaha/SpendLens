import './ToggleSwitch.css';

/**
 * @param {boolean} checked
 * @param {Function} onChange
 * @param {string} label
 */
export default function ToggleSwitch({ checked, onChange, label, id }) {
    const switchId = id || `toggle-${label?.toLowerCase().replace(/\s+/g, '-')}`;

    return (
        <div className="toggle-switch">
            {label && <label className="toggle-switch__label" htmlFor={switchId}>{label}</label>}
            <button
                id={switchId}
                role="switch"
                type="button"
                aria-checked={checked}
                aria-label={label}
                className={`toggle-switch__track ${checked ? 'toggle-switch__track--on' : ''}`}
                onClick={() => onChange(!checked)}
            >
                <span className="toggle-switch__thumb" />
            </button>
        </div>
    );
}
