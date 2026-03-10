import { useState } from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import './FormInput.css';

/**
 * @param {'text'|'email'|'password'|'number'|'date'|'textarea'} type
 * @param {string} label
 * @param {string} value
 * @param {Function} onChange
 * @param {string} error
 * @param {string} prefix
 * @param {boolean} showToggle - for password visibility
 */
export default function FormInput({
    type = 'text',
    label,
    value,
    onChange,
    error,
    prefix,
    showToggle = false,
    id,
    ...props
}) {
    const [showPassword, setShowPassword] = useState(false);
    const [focused, setFocused] = useState(false);
    const inputId = id || `input-${label?.toLowerCase().replace(/\s+/g, '-')}`;
    const hasValue = value !== undefined && value !== '';

    const inputType = type === 'password' && showPassword ? 'text' : type;

    if (type === 'textarea') {
        return (
            <div className={`form-input ${error ? 'form-input--error' : ''} ${focused ? 'form-input--focused' : ''}`}>
                <div className="form-input__wrapper">
                    <textarea
                        id={inputId}
                        className={`form-input__field form-input__textarea ${hasValue || focused ? 'form-input__field--has-value' : ''}`}
                        value={value}
                        onChange={onChange}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        rows={3}
                        {...props}
                    />
                    <label className="form-input__label" htmlFor={inputId}>{label}</label>
                </div>
                {error && (
                    <div className="form-input__error">
                        <AlertCircle size={14} />
                        <span>{error}</span>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={`form-input ${error ? 'form-input--error' : ''} ${focused ? 'form-input--focused' : ''}`}>
            <div className="form-input__wrapper">
                {prefix && <span className="form-input__prefix">{prefix}</span>}
                <input
                    id={inputId}
                    type={inputType}
                    className={`form-input__field ${hasValue || focused ? 'form-input__field--has-value' : ''} ${prefix ? 'form-input__field--has-prefix' : ''} ${type === 'number' ? 'mono' : ''}`}
                    value={value}
                    onChange={onChange}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    {...props}
                />
                <label className={`form-input__label ${prefix ? 'form-input__label--has-prefix' : ''}`} htmlFor={inputId}>
                    {label}
                </label>
                {type === 'password' && showToggle && (
                    <button
                        type="button"
                        className="form-input__toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                )}
            </div>
            {error && (
                <div className="form-input__error">
                    <AlertCircle size={14} />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
}
