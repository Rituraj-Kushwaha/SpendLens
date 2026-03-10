import { useRef, useEffect, useState } from 'react';
import './SegmentedControl.css';

/**
 * @param {string[]} options
 * @param {string} value
 * @param {Function} onChange
 */
export default function SegmentedControl({ options, value, onChange }) {
    const containerRef = useRef();
    const [indicatorStyle, setIndicatorStyle] = useState({});

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const idx = options.indexOf(value);
        const buttons = container.querySelectorAll('.seg-btn');
        if (buttons[idx]) {
            const btn = buttons[idx];
            setIndicatorStyle({
                left: btn.offsetLeft,
                width: btn.offsetWidth,
            });
        }
    }, [value, options]);

    return (
        <div className="segmented-control" ref={containerRef}>
            <div className="segmented-control__indicator" style={indicatorStyle} />
            {options.map(opt => (
                <button
                    key={opt}
                    type="button"
                    className={`seg-btn ${value === opt ? 'seg-btn--active' : ''}`}
                    onClick={() => onChange(opt)}
                >
                    {opt}
                </button>
            ))}
        </div>
    );
}
