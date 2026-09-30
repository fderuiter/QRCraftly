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

export interface CsvParseResult {
  headers: string[];
  rows: Record<string, string>[];
  rawRows: string[][];
}

/**
 * Parses a raw CSV string into headers and structured row objects.
 * Handles quoted values, escaped quotes (""), commas inside quotes, and CR/LF line endings.
 * 
 * @param csvText - The raw CSV string payload.
 * @returns Parsed CSV result with headers, key-value rows, and raw row arrays.
 */
export function parseCsv(csvText: string): CsvParseResult {
  const lines = parseCsvMatrix(csvText);
  if (lines.length === 0) {
    return { headers: [], rows: [], rawRows: [] };
  }

  // First non-empty row as headers
  const headers = lines[0].map((h, idx) => h.trim() || `Column_${idx + 1}`);
  const rawRows = lines.slice(1);

  const rows: Record<string, string>[] = [];
  for (const row of rawRows) {
    // Skip empty lines
    if (row.length === 1 && row[0].trim() === '') continue;

    const rowObj: Record<string, string> = {};
    headers.forEach((header, idx) => {
      rowObj[header] = row[idx] !== undefined ? row[idx].trim() : '';
    });
    rows.push(rowObj);
  }

  return { headers, rows, rawRows };
}

/**
 * Low-level CSV state machine that splits raw CSV text into a 2D array of strings.
 * Respects RFC 4180 rules for quotes and delimiters.
 */
function parseCsvMatrix(text: string): string[][] {
  const matrix: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote ("")
          currentField += '"';
          i += 2;
          continue;
        } else {
          // Closing quote
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
        i++;
        continue;
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++;
        }
        currentRow.push(currentField);
        matrix.push(currentRow);
        currentRow = [];
        currentField = '';
        i++;
        continue;
      } else if (char === '\n') {
        currentRow.push(currentField);
        matrix.push(currentRow);
        currentRow = [];
        currentField = '';
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField);
    matrix.push(currentRow);
  }

  return matrix;
}
