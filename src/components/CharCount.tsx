import React from 'react';

interface CharCountProps {
  current: number;
  max: number;
}

export const CharCount: React.FC<CharCountProps> = ({ current, max }) => {
  const percentage = (current / max) * 100;

  let colorClass = "text-slate-500 dark:text-slate-400";
  if (percentage >= 100) {
    colorClass = "text-rose-600 dark:text-rose-500 font-medium";
  } else if (percentage >= 90) {
    colorClass = "text-amber-600 dark:text-amber-500";
  }

  return (
    <div
      className={`text-xs text-right mt-1 transition-colors duration-200 ${colorClass}`}
      aria-live="polite"
      aria-atomic="true"
    >
      {current} / {max}
    </div>
  );
};
