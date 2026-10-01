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
import { BulkCsvContract, constructBulkCsvString, hydrateBulkCsvData } from '../index';
import { QRType } from '@/types';

describe('BulkCsvContract', () => {
  it('constructs CSV string correctly', () => {
    const csvContent = 'a,b\n1,2';
    expect(
      constructBulkCsvString({
        csvContent,
        payloadColumn: 'a',
        filenameColumn: 'b',
        exportFormat: 'png',
      })
    ).toBe(csvContent);
  });

  it('hydrates BulkCsvData correctly', () => {
    const raw = 'col1,col2\nval1,val2';
    const hydrated = hydrateBulkCsvData(raw);
    expect(hydrated.csvContent).toBe(raw);
    expect(hydrated.exportFormat).toBe('png');
  });

  it('implements BulkCsvContract contract correctly', () => {
    expect(BulkCsvContract.type).toBe(QRType.BULK_CSV);
    expect(BulkCsvContract.matches('col1,col2')).toBe(false);
    expect(BulkCsvContract.validate?.('col1,col2')).toEqual([]);
  });
});
