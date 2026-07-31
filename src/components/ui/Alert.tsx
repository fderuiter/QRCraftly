import React from 'react';
import { AlertTriangle, AlertCircle } from 'lucide-react';

/**
 *
 */
interface AlertProps {
  /**
   *
   */
  variant?: 'warning' | 'error';
  /**
   *
   */
  title?: string;
  /**
   *
   */
  children: React.ReactNode;
  /**
   *
   */
  className?: string;
  /**
   *
   */
  role?: string;
  /**
   *
   */
  'aria-live'?: 'polite' | 'assertive' | 'off';
}

/**
 *
 * @param root0
 * @param root0.variant
 * @param root0.title
 * @param root0.children
 * @param root0.className
 * @param root0.role
 * @param root0.'aria-live'
 */
export const Alert: React.FC<AlertProps> = ({ variant = 'warning', title, children, className = '', role, 'aria-live': ariaLive }) => {
  const isWarning = variant === 'warning';
  
  const baseClasses = "flex items-start gap-3 p-3 border rounded-lg text-sm";
  const colorClasses = isWarning 
    ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-400"
    : "bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300";
    
  const Icon = isWarning ? AlertTriangle : AlertCircle;

  return (
    <div role={role || "alert"} aria-live={ariaLive} className={`${baseClasses}${colorClasses}${className}`}>
      <Icon className="flex-shrink-0 h-5 mt-0.5 w-5" aria-hidden="true" />
      <div>
        {title && <strong>{title}: </strong>}
        {children}
      </div>
    </div>
  );
};
