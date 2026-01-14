import React from 'react';

interface CharCountProps {
  current: number;
  max: number;
  className?: string;
}

/**
 * A component that displays the current character count against a maximum limit.
 * It changes color as the limit approaches to warn the user.
 *
 * @param props - The component props.
 * @param props.current - The current number of characters.
 * @param props.max - The maximum allowed characters.
 * @param props.className - Optional additional classes.
 */
export const CharCount: React.FC<CharCountProps> = ({ current, max, className = '' }) => {
  const percentage = (current / max) * 100;

  let colorClass = 'text-slate-400 dark:text-slate-500'; // Default: Muted

  if (percentage >= 100) {
    colorClass = 'text-rose-600 dark:text-rose-400 font-medium'; // Over limit or full
  } else if (percentage >= 90) {
    colorClass = 'text-amber-600 dark:text-amber-400'; // Warning
  }

  return (
    <span
      className={`text-xs transition-colors duration-200 ${colorClass} ${className}`}
      aria-label={`${current} of ${max} characters used`}
      role="status"
    >
      {current} / {max}
    </span>
  );
};
