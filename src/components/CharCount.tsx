import React from 'react';

interface CharCountProps {
  current: number;
  max: number;
}

export const CharCount: React.FC<CharCountProps> = ({ current, max }) => {
  const isNearLimit = current >= max * 0.9;
  const isAtLimit = current >= max;

  let colorClass = "text-slate-400 dark:text-slate-500";
  if (isAtLimit) {
    colorClass = "text-rose-600 dark:text-rose-400 font-medium";
  } else if (isNearLimit) {
    colorClass = "text-amber-600 dark:text-amber-400";
  }

  return (
    <div className={`text-xs text-right mt-1 transition-colors ${colorClass}`} aria-live="polite">
      {current} / {max}
    </div>
  );
};
