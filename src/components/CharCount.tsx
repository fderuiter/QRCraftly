/*
    QRCraftly
    Copyright (C) 2025 fderuiter

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import React from 'react';

/**
 *
 */
interface CharCountProps {
  /**
   *
   */
  current: number;
  /**
   *
   */
  max: number;
  /**
   *
   */
  id?: string;
}

/**
 *
 * @param root0
 * @param root0.current
 * @param root0.max
 * @param root0.id
 */
export const CharCount: React.FC<CharCountProps> = ({ current, max, id }) => {
  const percentage = (current / max) * 100;
  const visualPercentage = Math.min(percentage, 100);

  // Circle configuration
  const radius = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (visualPercentage / 100) * circumference;

  let colorClass = "text-slate-500 dark:text-slate-400";
  if (percentage >= 100) {
    colorClass = "text-rose-700 dark:text-rose-500 font-medium";
  } else if (percentage >= 90) {
    colorClass = "text-amber-700 dark:text-amber-500";
  }

  return (
    <div
      id={id}
      className={`mt-1 flex items-center justify-end gap-2 text-xs transition-colors duration-200 ${colorClass}`}
      aria-live="polite"
      aria-atomic="true"
    >
      <span aria-hidden="true">
        {current} / {max}
      </span>
      <span className="sr-only">
        {current} of {max} characters used
      </span>

      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        className="-rotate-90 transform"
        aria-hidden="true"
      >
        {/* Background track */}
        <circle
          cx="12"
          cy="12"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="opacity-20"
        />
        {/* Progress indicator */}
        <circle
          cx="12"
          cy="12"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-out"
        />
      </svg>
    </div>
  );
};
