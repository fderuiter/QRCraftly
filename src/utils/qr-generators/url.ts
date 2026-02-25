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

import { UrlData } from '../../types';
import { isDangerousUrl } from '../security';

/**
 * Constructs the URL QR code string.
 * Currently just returns the raw URL as normalization happens in the input or renderer.
 */
export const constructUrlString = (data: UrlData): string => {
  if (isDangerousUrl(data.url)) {
    return '';
  }
  return data.url;
};

/**
 * Hydrates UrlData from a raw string.
 */
export const hydrateUrlData = (raw: string): UrlData => {
  return { url: raw };
};
