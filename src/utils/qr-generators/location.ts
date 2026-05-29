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

import { LocationData } from '../../types';

/**
 * Validates and parses a coordinate string as a finite floating-point number.
 * Returns `null` if the value is not a valid finite number.
 */
const parseCoordinate = (value: string): number | null => {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const num = parseFloat(trimmed);
  return isFinite(num) ? num : null;
};

/**
 * Constructs a `geo:` URI from latitude and longitude.
 *
 * Validates that:
 * - Both coordinates are valid finite numbers.
 * - Latitude is in the range [-90, 90].
 * - Longitude is in the range [-180, 180].
 *
 * Returns an empty string if validation fails.
 *
 * @param data - The location data containing latitude and longitude strings.
 * @returns A `geo:LAT,LONG` URI string, or an empty string on invalid input.
 */
export const constructLocationString = (data: LocationData): string => {
  const lat = parseCoordinate(data.latitude);
  const lng = parseCoordinate(data.longitude);

  if (lat === null || lng === null) return '';
  if (lat < -90 || lat > 90) return '';
  if (lng < -180 || lng > 180) return '';

  return `geo:${lat},${lng}`;
};

/**
 * Hydrates LocationData from a raw string.
 */
export const hydrateLocationData = (raw: string): LocationData => {
  const result: LocationData = {
    latitude: '',
    longitude: '',
  };

  if (raw.toLowerCase().startsWith('geo:')) {
    // geo:LAT,LONG
    const parts = raw.substring(4).split(',');
    if (parts.length >= 2) {
      result.latitude = parts[0];
      result.longitude = parts[1];
    }
  }

  return result;
};
