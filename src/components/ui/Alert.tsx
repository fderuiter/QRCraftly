import React from 'react';
import { getNotificationColors, getNotificationIcon } from '../../utils/notificationStyles';
import { mergeClasses } from './styles';

/**
 * Properties for the Alert component.
 */
interface AlertProps {
  /**
   * The style variant of the alert (warning or error).
   */
  variant?: 'warning' | 'error';
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
}

/**
 * An accessible Alert component that displays warning or error status messages.
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
  } = props;
  const baseClasses = "flex items-start gap-3 p-3 border rounded-lg text-sm";
  const colorClasses = getNotificationColors(variant, true);

  return (
    <div role={role || "alert"} aria-live={ariaLive} className={mergeClasses(baseClasses, colorClasses, className)}>
      {React.createElement(getNotificationIcon(variant), {
        className: "mt-0.5 size-5 flex-shrink-0",
        "aria-hidden": "true",
      })}
      <div>
        {title && <strong>{title}: </strong>}
        {children}
      </div>
    </div>
  );
};
