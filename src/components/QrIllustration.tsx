/*
    QRCraftly
    Copyright (C) 2026 fderuiter

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

/** Data modules of the 9 by 9 drawing, as [column, row] (finder patterns are drawn separately). */
const MODULES: ReadonlyArray<readonly [number, number]> = [
  [4, 0], [4, 2], [3, 3], [5, 3], [0, 4], [2, 4], [4, 4], [6, 4], [8, 4],
  [4, 5], [3, 6], [5, 6], [7, 6], [4, 7], [6, 7], [8, 7], [5, 8], [7, 8],
];

/** Finder pattern origins: top left, top right and bottom left. */
const FINDERS: ReadonlyArray<readonly [number, number]> = [[0, 0], [6, 0], [0, 6]];

/**
 * Small decorative QR drawn from modules, in the current text colour. `broken` knocks a
 * few modules loose for error states such as the 404 page.
 * @param props - Illustration properties.
 * @param props.broken - Scatter some modules, as if the code fell apart.
 * @param props.className - Size and colour classes.
 * @returns A decorative SVG, hidden from assistive technology.
 */
export function QrIllustration({ broken = false, className = 'size-6' }: { broken?: boolean; className?: string }) {
  return (
    <svg viewBox="-1 -1 11 11" className={className} fill="currentColor" aria-hidden="true" focusable="false">
      {FINDERS.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <path d={`M${x} ${y}h3v3h-3z M${x + 0.6} ${y + 0.6}v1.8h1.8v-1.8z`} fillRule="evenodd" />
          <rect x={x + 1} y={y + 1} width="1" height="1" />
        </g>
      ))}
      {MODULES.map(([x, y], index) => {
        // When broken, every third module drifts down and turns a little.
        const loose = broken && index % 3 === 0;
        return (
          <rect
            key={`${x}-${y}`}
            x={x}
            y={loose ? y + 0.6 : y}
            width="0.9"
            height="0.9"
            opacity={loose ? 0.5 : 1}
            transform={loose ? `rotate(20 ${x + 0.45} ${y + 1})` : undefined}
          />
        );
      })}
    </svg>
  );
}
