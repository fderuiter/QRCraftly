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
import JSZip from 'jszip';
import {
  parseCsv,
  sanitizeFilename,
  renderBatch,
  createBulkCsvWorker,
  isBulkCsvRequest,
  isBulkCsvResponse,
} from '../index';
import { QRStyle, QRType, QRErrorCorrectionLevel, SocialFormat, TemplateStyle } from '@/types';

const defaultTestConfig = {
  value: 'https://example.com',
  type: QRType.URL,
  fgColor: '#000000',
  bgColor: '#ffffff',
  style: QRStyle.STANDARD,
  logoUrl: null,
  logoSize: 0.2,
  logoPaddingStyle: 'square' as const,
  logoPadding: 2,
  logoBackgroundColor: '#ffffff',
  eyeColor: '#000000',
  errorCorrectionLevel: QRErrorCorrectionLevel.M,
  isBorderEnabled: false,
  borderSize: 0.05,
  borderColor: '#000000',
  borderStyle: 'solid' as const,
  borderText: '',
  borderTextPosition: 'bottom-center' as const,
  borderTextColor: '#000000',
  borderLogoUrl: null,
  borderLogoPosition: 'bottom-center' as const,
  socialFormat: SocialFormat.SQUARE_1_1,
  templateStyle: TemplateStyle.NONE,
};

describe('bulk-csv package', () => {
  describe('parseCsv', () => {
    it('parses basic CSV data into headers and rows', () => {
      const csv = `Name,URL,Category\nGoogle,https://google.com,Search\nGitHub,https://github.com,Dev`;
      const result = parseCsv(csv);

      expect(result.headers).toEqual(['Name', 'URL', 'Category']);
      expect(result.rows.length).toBe(2);
      expect(result.rows[0]).toEqual({
        Name: 'Google',
        URL: 'https://google.com',
        Category: 'Search',
      });
      expect(result.rows[1]).toEqual({
        Name: 'GitHub',
        URL: 'https://github.com',
        Category: 'Dev',
      });
    });

    it('handles quoted fields and escaped quotes', () => {
      const csv = `"Product Name","Website"\n"Widget, ""Special""","https://widget.com"`;
      const result = parseCsv(csv);

      expect(result.headers).toEqual(['Product Name', 'Website']);
      expect(result.rows[0]).toEqual({
        'Product Name': 'Widget, "Special"',
        Website: 'https://widget.com',
      });
    });

    it('returns empty results for empty or whitespace-only CSV', () => {
      const result = parseCsv('   \n  \n');
      expect(result.rows).toEqual([]);
    });
  });

  describe('sanitizeFilename', () => {
    it('replaces forbidden file characters with underscore', () => {
      expect(sanitizeFilename('my/file:name*?.png')).toBe('my_file_name__.png');
      expect(sanitizeFilename('  test  ')).toBe('test');
      expect(sanitizeFilename('///')).toBe('qr_code');
    });
  });

  describe('renderBatch', () => {
    it('renders SVG files into a ZIP archive', async () => {
      const rows = [
        { Name: 'SiteA', Link: 'https://a.com' },
        { Name: 'SiteB', Link: 'https://b.com' },
      ];

      const zipData = await renderBatch({
        csvRows: rows,
        config: defaultTestConfig,
        options: {
          payloadColumn: 'Link',
          filenameColumn: 'Name',
          format: 'svg',
        },
      });

      expect(zipData).toBeInstanceOf(Uint8Array);
      expect(zipData.length).toBeGreaterThan(0);

      // Unzip and verify contents
      const unzipped = await JSZip.loadAsync(zipData);
      expect(Object.keys(unzipped.files)).toEqual(['SiteA.svg', 'SiteB.svg']);

      const contentA = await unzipped.files['SiteA.svg'].async('text');
      expect(contentA).toContain('<svg');
      expect(contentA).toContain('</svg>');
    });

    it('throws error when batch processing is cancelled', async () => {
      const rows = [
        { Link: 'https://a.com' },
        { Link: 'https://b.com' },
      ];

      await expect(
        renderBatch({
          csvRows: rows,
          config: defaultTestConfig,
          options: { payloadColumn: 'Link' },
          isCancelled: () => true,
        })
      ).rejects.toThrow('cancelled');
    });
  });

  describe('contract type guards', () => {
    it('identifies valid requests and responses', () => {
      const validReq = { type: 'START', id: '123', csvText: '', config: defaultTestConfig, options: { payloadColumn: 'a' } };
      expect(isBulkCsvRequest(validReq)).toBe(true);
      expect(isBulkCsvRequest({ type: 'UNKNOWN' })).toBe(false);

      const validRes = { type: 'PROGRESS', id: '123', processed: 1, total: 2, currentFilename: 'a.svg' };
      expect(isBulkCsvResponse(validRes)).toBe(true);
      expect(isBulkCsvResponse({ type: 'INVALID' })).toBe(false);
    });

    it('creates bulk CSV worker handle or returns null', () => {
      const worker = createBulkCsvWorker();
      expect(worker === null || typeof worker === 'object').toBe(true);
    });
  });
});
