import { useState, useEffect } from 'react';

/**
 * Animate a number counting to endValue with easeOutQuart.
 * Re-runs whenever endValue changes.
 * @param {number} endValue - target number
 * @param {number} duration - animation duration in ms (default 800)
 * @returns {number} - current animated value
 */
export function useCountUp(endValue, duration = 800) {
    const [currentValue, setCurrentValue] = useState(0);

    useEffect(() => {
        if (!endValue) {
            setCurrentValue(0);
            return;
        }

        let rafId;
        const startTime = performance.now();
        const startValue = 0;

        function easeOutQuart(t) {
            return 1 - Math.pow(1 - t, 4);
        }

        function animate(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutQuart(progress);
            setCurrentValue(Math.round(startValue + easedProgress * (endValue - startValue)));

            if (progress < 1) {
                rafId = requestAnimationFrame(animate);
            }
        }

        rafId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(rafId);
    }, [endValue, duration]);

    return currentValue;
}
