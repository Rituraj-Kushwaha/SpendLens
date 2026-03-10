import './SkeletonLoader.css';

/**
 * @param {'text'|'circle'|'card'|'chart'} variant
 * @param {string|number} width
 * @param {string|number} height
 * @param {number} count
 */
export default function SkeletonLoader({ variant = 'text', width, height, count = 1 }) {
    const items = Array.from({ length: count }, (_, i) => i);

    const getStyles = () => {
        const styles = {};
        if (width) styles.width = typeof width === 'number' ? `${width}px` : width;
        if (height) styles.height = typeof height === 'number' ? `${height}px` : height;
        return styles;
    };

    return (
        <div className="skeleton-group">
            {items.map(i => (
                <div
                    key={i}
                    className={`skeleton skeleton--${variant}`}
                    style={getStyles()}
                />
            ))}
        </div>
    );
}
