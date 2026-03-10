import { useState, useEffect } from 'react';

/**
 * Persist state to localStorage with SSR safety.
 * @param {string} key - localStorage key
 * @param {*} defaultValue - fallback value
 * @returns {[*, Function]} - [value, setValue]
 */
export function useLocalStorage(key, defaultValue) {
    const [value, setValue] = useState(() => {
        try {
            const stored = localStorage.getItem(key);
            return stored !== null ? JSON.parse(stored) : defaultValue;
        } catch {
            return defaultValue;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch {
            // silently fail for storage quota issues
        }
    }, [key, value]);

    return [value, setValue];
}
