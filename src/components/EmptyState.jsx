import Button from './Button';
import './EmptyState.css';

/**
 * @param {import('react').ReactNode} icon
 * @param {string} title
 * @param {string} description
 * @param {{label: string, onClick: Function}} action
 */
export default function EmptyState({ icon, title, description, action }) {
    return (
        <div className="empty-state">
            {icon && <div className="empty-state__icon">{icon}</div>}
            <h4 className="empty-state__title">{title}</h4>
            <p className="empty-state__desc">{description}</p>
            {action && (
                <Button variant="primary" size="md" onClick={action.onClick}>
                    {action.label}
                </Button>
            )}
        </div>
    );
}
