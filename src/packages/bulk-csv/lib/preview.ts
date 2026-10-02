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

import { CsvParseError, MAX_BULK_CSV_ROWS, parseCsv, type CsvRow } from './csv';

/** Header names that usually hold the QR content. */
export const PAYLOAD_COLUMN_PATTERN = /url|link|payload|data|qr/i;
/** Header names that usually hold a per-row file name. */
export const FILENAME_COLUMN_PATTERN = /name|id|label|title|filename/i;

/**
 * Picks the first column whose header matches `pattern`, else the first column.
 * @param columns Header names.
 * @param pattern Preferred header pattern.
 * @returns The chosen column, or `''` when there are no columns.
 */
export function pickColumn(columns: string[], pattern: RegExp): string {
  return columns.find((col) => pattern.test(col)) ?? columns[0] ?? '';
}

/**
 * True when the row has a non-blank value in the payload column.
 * @param row Parsed row.
 * @param payloadColumn Payload column header.
 * @returns Whether the row would produce a QR code.
 */
export function hasPayload(row: CsvRow, payloadColumn: string): boolean {
  return (row[payloadColumn] ?? '').trim() !== '';
}

/** The row the live preview encodes. */
export interface BulkCsvPreview {
  /** Payload of the first row that has one. */
  payload: string;
  /** 1-based number of that row among the data rows. */
  rowNumber: number;
  /** Number of data rows used for the batch. */
  rowCount: number;
}

/**
 * Finds what the live preview should encode: the payload of the first data row that has
 * one, not the whole CSV. Uses `payloadColumn`, or the column the input would pick.
 * @param csvContent Raw CSV text.
 * @param payloadColumn Selected payload column, or `''` for the default.
 * @returns The preview row, or null when the CSV is empty, unreadable or has no payloads.
 */
export function previewRow(csvContent: string, payloadColumn: string): BulkCsvPreview | null {
  if (!csvContent) return null;
  let table;
  try {
    table = parseCsv(csvContent, { maxRows: MAX_BULK_CSV_ROWS });
  } catch (err) {
    if (err instanceof CsvParseError) return null;
    throw err;
  }
  const column = table.headers.includes(payloadColumn) ? payloadColumn : pickColumn(table.headers, PAYLOAD_COLUMN_PATTERN);
  if (!column) return null;
  const index = table.rows.findIndex((row) => hasPayload(row, column));
  if (index === -1) return null;
  return { payload: table.rows[index][column].trim(), rowNumber: index + 1, rowCount: table.rows.length };
}
