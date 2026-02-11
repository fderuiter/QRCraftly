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
