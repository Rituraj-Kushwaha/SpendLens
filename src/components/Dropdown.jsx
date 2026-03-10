import { useState, useRef, useEffect } from 'react';
import './Dropdown.css';

/**
 * @param {import('react').ReactNode} trigger
 * @param {{label: string, icon?: import('react').ReactNode, onClick: Function, variant?: string}[]} items
 */
export default function Dropdown({ trigger, items }) {
    const [open, setOpen] = useState(false);
    const ref = useRef();

    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div className="dropdown" ref={ref}>
            <div onClick={() => setOpen(!open)}>{trigger}</div>
            {open && (
                <div className="dropdown__menu">
                    {items.map((item, i) => (
                        <button
                            key={i}
                            className={`dropdown__item ${item.variant === 'danger' ? 'dropdown__item--danger' : ''}`}
                            onClick={() => { item.onClick(); setOpen(false); }}
                        >
                            {item.icon && <span className="dropdown__item-icon">{item.icon}</span>}
                            {item.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
