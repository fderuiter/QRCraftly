import React from 'react';
import { X } from 'lucide-react';
import { getNotificationColors, getNotificationIcon } from '../../utils/notificationStyles';
import { mergeClasses } from './styles';

/**
 * Properties for the Alert component.
 */
interface AlertProps {
  /**
   * The style variant of the alert (warning, error, or info).
   */
  variant?: 'warning' | 'error' | 'info';
  /**
   * Optional bold title text.
   */
  title?: string;
  /**
   * Inner content to render.
   */
  children: React.ReactNode;
  /**
   * Optional custom CSS class name.
   */
  className?: string;
  /**
   * Optional ARIA role attribute.
   */
  role?: string;
  /**
   * Optional aria-live attribute for screen readers.
   */
  'aria-live'?: 'polite' | 'assertive' | 'off';
  /**
   * Optional callback when the dismiss button is clicked.
   */
  onDismiss?: () => void;
}

/**
 * An accessible Alert component that displays warning, error, or informational status messages.
 * @param props Component properties.
 * @returns React functional component rendering an alert box.
 */
export const Alert: React.FC<AlertProps> = (props) => {
  const {
    variant = 'warning',
    title,
    children,
    className = '',
    role,
    'aria-live': ariaLive,
    onDismiss,
  } = props;
  const baseClasses = 'flex items-start gap-3 p-3 border rounded-lg text-sm';
  const colorClasses = getNotificationColors(variant, true);

  return (
    <div role={role || 'alert'} aria-live={ariaLive} className={mergeClasses(baseClasses, colorClasses, className)}>
      {React.createElement(getNotificationIcon(variant), {
        className: 'mt-0.5 size-5 flex-shrink-0',
        'aria-hidden': 'true',
      })}
      <div className="flex-1">
        {title && <strong>{title}: </strong>}
        {children}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="-mt-1 -mr-1 ml-auto rounded-md p-1 opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-1 focus:outline-none"
          aria-label="Dismiss alert"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
};
