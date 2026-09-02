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

import { useImageLoader } from './useImageLoader';

/**
 * Hook to load an image asynchronously.
 * Delegates to useImageLoader to provide centralized image loading and memory lifecycle management.
 * Returns the HTMLImageElement once loaded, or null.
 * @param url - The image URL string or null.
 * @returns The HTMLImageElement once loaded, or null.
 */
export const useImage = (url: string | null): HTMLImageElement | null => {
  const { image } = useImageLoader(url);
  return image;
};
