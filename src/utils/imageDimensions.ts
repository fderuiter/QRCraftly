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

/**
 * Calculates dynamic clamped image dimensions while maintaining aspect ratio.
 *
 * @param width Original image width
 * @param height Original image height
 * @param maxDim Maximum allowed dimension (width or height)
 * @returns Object containing calculated width and height
 */
export const calculateClampedDimensions = (
  width: number,
  height: number,
  maxDim: number
): { width: number; height: number } => {
  if (width > maxDim || height > maxDim) {
    const ratio = Math.min(maxDim / width, maxDim / height);
    return {
      width: Math.round(width * ratio),
      height: Math.round(height * ratio)
    };
  }
  return { width, height };
};
