import React from 'react';

interface CharCountProps {
  id: string;
  current: number;
  max: number;
}

const CharCount: React.FC<CharCountProps> = ({ id, current, max }) => {
  const percentage = (current / max) * 100;

  let colorClass = 'text-slate-400 dark:text-slate-500';
  if (percentage >= 100) {
    colorClass = 'text-rose-600 dark:text-rose-400 font-medium';
  } else if (percentage >= 90) {
    colorClass = 'text-amber-600 dark:text-amber-400';
  }

  return (
    <span
      id={id}
      className={`text-xs transition-colors duration-200 ${colorClass}`}
      aria-live="polite"
      aria-atomic="true"
    >
      {current}/{max}
    </span>
  );
};

export default React.memo(CharCount);
