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

import { describe, it, expect } from 'vitest';
import { previewRow, pickColumn, PAYLOAD_COLUMN_PATTERN, FILENAME_COLUMN_PATTERN } from '../index';

describe('previewRow', () => {
  it('returns the first row that has a payload, with its position', () => {
    const csv = 'url,name\n,Empty\nhttps://a.example,A\nhttps://b.example,B';
    expect(previewRow(csv, 'url')).toEqual({ payload: 'https://a.example', rowNumber: 2, rowCount: 3 });
  });

  it('uses the detected payload column when the chosen one is missing', () => {
    expect(previewRow('title,qr\nHello,  WIFI:S:x;;  ', 'nope')?.payload).toBe('WIFI:S:x;;');
  });

  it('returns null when there is nothing to preview', () => {
    expect(previewRow('', 'url')).toBeNull();
    expect(previewRow('url\n', 'url')).toBeNull();
    expect(previewRow('url\n"unterminated', 'url')).toBeNull();
  });
});

describe('pickColumn', () => {
  it('prefers a matching header, then the first column', () => {
    expect(pickColumn(['id', 'link'], PAYLOAD_COLUMN_PATTERN)).toBe('link');
    expect(pickColumn(['code', 'value'], PAYLOAD_COLUMN_PATTERN)).toBe('code');
    expect(pickColumn(['url', 'label'], FILENAME_COLUMN_PATTERN)).toBe('label');
    expect(pickColumn([], PAYLOAD_COLUMN_PATTERN)).toBe('');
  });
});
