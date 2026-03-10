import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import './Drawer.css';

/**
 * @param {boolean} isOpen
 * @param {Function} onClose
 * @param {string} title
 * @param {import('react').ReactNode} children
 */
export default function Drawer({ isOpen, onClose, title, children }) {
    const drawerRef = useRef();
    const previousFocus = useRef();

    useEffect(() => {
        if (isOpen) {
            previousFocus.current = document.activeElement;
            drawerRef.current?.focus();
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
            previousFocus.current?.focus();
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <>
            <div className="drawer-backdrop" onClick={onClose} />
            <div className="drawer" ref={drawerRef} tabIndex={-1} role="dialog" aria-label={title}>
                <div className="drawer__header">
                    <h3 className="drawer__title">{title}</h3>
                    <button className="drawer__close" onClick={onClose} aria-label="Close">
                        <X size={20} />
                    </button>
                </div>
                <div className="drawer__body">
                    {children}
                </div>
            </div>
        </>
    );
}
