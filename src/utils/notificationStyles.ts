import { AlertCircle, AlertTriangle, CheckCircle, Info, LucideIcon } from 'lucide-react';

export type NotificationState = 'success' | 'error' | 'warning' | 'info';

/**
 * Returns color classes for the specified notification state.
 * @param state The notification state type.
 * @param isAlert Boolean indicating if the style is for Alert component.
 * @returns Space-separated Tailwind color classes.
 */
export function getNotificationColors(state: NotificationState, isAlert = false): string {
  switch (state) {
    case 'success':
      return 'bg-teal-50 dark:bg-teal-900/30 border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200';
    case 'error':
      return isAlert
        ? 'bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
        : 'bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200';
    case 'warning':
      return 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-400';
    case 'info':
      return 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200';
  }
}

/**
 * Returns the Lucide icon component for the specified notification state.
 * @param state The notification state type.
 * @returns The Lucide icon component.
 */
export function getNotificationIcon(state: NotificationState): LucideIcon {
  switch (state) {
    case 'success':
      return CheckCircle;
    case 'error':
      return AlertCircle;
    case 'warning':
      return AlertTriangle;
    case 'info':
      return Info;
  }
}
