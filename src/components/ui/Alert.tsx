import React from 'react';
import { AlertTriangle, AlertCircle } from 'lucide-react';

interface AlertProps {
  variant?: 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  className?: string;
  role?: string;
  'aria-live'?: 'polite' | 'assertive' | 'off';
}

export const Alert: React.FC<AlertProps> = ({ variant = 'warning', title, children, className = '', role, 'aria-live': ariaLive }) => {
  const isWarning = variant === 'warning';
  
  const baseClasses = "flex items-start gap-3 p-3 border rounded-lg text-sm";
  const colorClasses = isWarning 
    ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-400"
    : "bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300";
    
  const Icon = isWarning ? AlertTriangle : AlertCircle;

  return (
    <div role={role || "alert"} aria-live={ariaLive} className={`${baseClasses} ${colorClasses} ${className}`}>
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <div>
        {title && <strong>{title}: </strong>}
        {children}
      </div>
    </div>
  );
};
