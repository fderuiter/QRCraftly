import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Alert } from '../ui/Alert';

/**
 * Props for the ContrastBadge component.
 */
export interface ContrastBadgeProps {
  /**
   * Whether the low contrast warning is active and visible.
   */
  isVisible: boolean;
  /**
   * The calculated contrast ratio to display.
   */
  contrastRatio: number;
  /**
   * Decimal precision format for the displayed contrast value.
   * Defaults to 1 decimal place.
   */
  decimalPrecision?: number;
  /**
   * Optional test ID for automated testing compatibility.
   */
  'data-testid'?: string;
}

/**
 * A centralized inline badge component for standardizing visual style,
 * text size, and screen-reader polite notifications for low-contrast warnings.
 * @param root0
 * @param root0.isVisible
 * @param root0.contrastRatio
 * @param root0.decimalPrecision
 * @param root0.'data-testid'
 */
export const ContrastBadge: React.FC<ContrastBadgeProps> = ({
  isVisible,
  contrastRatio,
  decimalPrecision = 1,
  'data-testid': dataTestId,
}) => {
  return (
    <span aria-live="polite" aria-atomic="true" className="inline-block">
      {isVisible && (
        <span
          className="flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400"
          data-testid={dataTestId}
        >
          <AlertTriangle className="size-3" aria-hidden="true" />
          Low Contrast ({contrastRatio.toFixed(decimalPrecision)})
        </span>
      )}
    </span>
  );
};

/**
 * Props for the ContrastBanner component.
 */
export interface ContrastBannerProps {
  /**
   * Whether the warning banner is active and visible.
   */
  isVisible: boolean;
  /**
   * The calculated contrast ratio to display.
   */
  contrastRatio: number;
  /**
   * The context message type to display.
   */
  messageType: 'color' | 'layout';
  /**
   * Decimal precision format for the displayed contrast value.
   * Defaults to 2 decimal places.
   */
  decimalPrecision?: number;
  /**
   * Additional CSS classes to apply to the alert wrapper.
   */
  className?: string;
  /**
   * Accessible role attribute for the alert (e.g., 'status' or 'alert').
   * Defaults to 'status'.
   */
  role?: string;
}

/**
 * A centralized warning banner component that unifies bottom styling alert boxes,
 * providing standard screen-reader dynamic notifications and customizable precision.
 * @param root0
 * @param root0.isVisible
 * @param root0.contrastRatio
 * @param root0.messageType
 * @param root0.decimalPrecision
 * @param root0.className
 * @param root0.role
 */
export const ContrastBanner: React.FC<ContrastBannerProps> = ({
  isVisible,
  contrastRatio,
  messageType,
  decimalPrecision = 2,
  className = '',
  role = 'status',
}) => {
  return (
    <div aria-live="polite" aria-atomic="true">
      {isVisible && (
        <Alert variant="warning" className={className} role={role}>
          {messageType === 'color'
            ? `Warning: The contrast ratio is low (${contrastRatio.toFixed(decimalPrecision)}). QR codes should have high contrast (aim for 4.5:1) to be scannable by all devices.`
            : `The contrast ratio between the layout's text and background is low (${contrastRatio.toFixed(decimalPrecision)}). Ensure contrast is above 4.5:1 for ideal legibility on export.`}
        </Alert>
      )}
    </div>
  );
};
