/*
    QRCraftly
    Copyright (C) 2025-2026 fderuiter

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

import { describe, it, expect } from 'vitest';
import { constructLocationString, hydrateLocationData } from '../index';

describe('Location generator', () => {
  it('constructs and hydrates successfully', () => {
    const data = {
      latitude: '37.7749',
      longitude: '-122.4194',
    };
    const str = constructLocationString(data);
    const hydrated = hydrateLocationData(str);
    expect(hydrated).toEqual(data);
  });

  it('handles missing or malformed data', () => {
    expect(hydrateLocationData('random').latitude).toBe('');
    expect(hydrateLocationData('geo:123').latitude).toBe('');
  });
});
