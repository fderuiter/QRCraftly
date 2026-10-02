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
import { parseCsv, CsvParseError, MAX_BULK_CSV_ROWS, MAX_BULK_CSV_CHARS } from '../index';

describe('parseCsv', () => {
  it('maps data rows to the header row', () => {
    const table = parseCsv('url,name\nhttps://a.example,A\nhttps://b.example,B');
    expect(table.headers).toEqual(['url', 'name']);
    expect(table.rows).toEqual([
      { url: 'https://a.example', name: 'A' },
      { url: 'https://b.example', name: 'B' },
    ]);
    expect(table.totalRows).toBe(2);
    expect(table.truncated).toBe(false);
  });

  it('accepts CRLF, LF and lone CR line endings and a trailing line break', () => {
    const expected = [{ a: '1', b: '2' }, { a: '3', b: '4' }];
    expect(parseCsv('a,b\r\n1,2\r\n3,4\r\n').rows).toEqual(expected);
    expect(parseCsv('a,b\n1,2\n3,4\n').rows).toEqual(expected);
    expect(parseCsv('a,b\r1,2\r3,4').rows).toEqual(expected);
  });

  it('handles quoted fields with delimiters, escaped quotes and embedded line breaks', () => {
    const csv = 'text,id\r\n"Hello, world",1\r\n"She said ""hi""",2\r\n"line one\r\nline two\nline three",3\r\n"",4';
    expect(parseCsv(csv).rows).toEqual([
      { text: 'Hello, world', id: '1' },
      { text: 'She said "hi"', id: '2' },
      { text: 'line one\r\nline two\nline three', id: '3' },
      { text: '', id: '4' },
    ]);
  });

  it('strips a UTF-8 byte order mark from the first header', () => {
    const table = parseCsv('﻿url,name\nhttps://a.example,A');
    expect(table.headers).toEqual(['url', 'name']);
    expect(table.rows[0].url).toBe('https://a.example');
  });

  it('keeps non-ASCII text intact', () => {
    expect(parseCsv('naam,stad\nZoë,Zürich\n東京,日本').rows).toEqual([
      { naam: 'Zoë', stad: 'Zürich' },
      { naam: '東京', stad: '日本' },
    ]);
  });

  it('skips blank lines, including before the header', () => {
    const table = parseCsv('\n\n a , b \n\n1,2\n , \n3,4\n\n');
    expect(table.headers).toEqual(['a', 'b']);
    expect(table.rows).toEqual([{ a: '1', b: '2' }, { a: '3', b: '4' }]);
    expect(table.totalRows).toBe(2);
  });

  it('names empty headers and de-duplicates repeated ones', () => {
    expect(parseCsv('url,,url,url\n1,2,3,4').headers).toEqual(['url', 'Column 2', 'url_2', 'url_3']);
  });

  it('fills missing cells with empty strings and ignores extra cells', () => {
    expect(parseCsv('a,b,c\n1\n1,2,3,4').rows).toEqual([
      { a: '1', b: '', c: '' },
      { a: '1', b: '2', c: '3' },
    ]);
  });

  it('keeps a quote inside an unquoted field and text after a closing quote literally', () => {
    expect(parseCsv('a,b\n5" screen,"x"y').rows).toEqual([{ a: '5" screen', b: 'xy' }]);
  });

  it('supports a custom delimiter', () => {
    expect(parseCsv('a;b\n"1;2";3', { delimiter: ';' }).rows).toEqual([{ a: '1;2', b: '3' }]);
  });

  it('returns an empty table for empty or blank input', () => {
    expect(parseCsv('')).toEqual({ headers: [], rows: [], totalRows: 0, truncated: false });
    expect(parseCsv('\r\n\r\n')).toEqual({ headers: [], rows: [], totalRows: 0, truncated: false });
    expect(parseCsv('only,headers')).toEqual({ headers: ['only', 'headers'], rows: [], totalRows: 0, truncated: false });
  });

  it('throws CsvParseError on an unterminated quoted field with its line number', () => {
    expect(() => parseCsv('a,b\n1,2\n"open,3')).toThrow(CsvParseError);
    expect(() => parseCsv('a,b\n1,2\n"open,3')).toThrow(/line 3/);
  });

  it('rejects invalid delimiters and oversize input', () => {
    expect(() => parseCsv('a', { delimiter: '"' })).toThrow(CsvParseError);
    expect(() => parseCsv('a', { delimiter: ',,' })).toThrow(CsvParseError);
    expect(() => parseCsv('a'.repeat(MAX_BULK_CSV_CHARS + 1))).toThrow(/too large/);
  });

  it('keeps at most maxRows rows but counts every row', () => {
    const lines = Array.from({ length: 12 }, (_, i) => `v${i}`);
    const table = parseCsv(`col\n${lines.join('\n')}`, { maxRows: 5 });
    expect(table.rows).toHaveLength(5);
    expect(table.rows[4].col).toBe('v4');
    expect(table.totalRows).toBe(12);
    expect(table.truncated).toBe(true);
  });

  it(`defaults to a ${MAX_BULK_CSV_ROWS} row limit`, () => {
    const lines = Array.from({ length: MAX_BULK_CSV_ROWS + 3 }, (_, i) => `https://example.com/${i}`);
    const table = parseCsv(`url\n${lines.join('\n')}`);
    expect(table.rows).toHaveLength(MAX_BULK_CSV_ROWS);
    expect(table.totalRows).toBe(MAX_BULK_CSV_ROWS + 3);
    expect(table.truncated).toBe(true);
  });
});
