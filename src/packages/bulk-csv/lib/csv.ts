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

/** Most data rows a bulk batch keeps in memory. Rows past this are counted, not stored. */
export const MAX_BULK_CSV_ROWS = 500;

/** Largest CSV text, in UTF-16 code units, the parser accepts (about 2 MB of ASCII). */
export const MAX_BULK_CSV_CHARS = 2 * 1024 * 1024;

/** One data row keyed by header name. */
export type CsvRow = Record<string, string>;

/** Result of parsing a CSV document with a header row. */
export interface CsvTable {
  /** Header names in column order, trimmed, de-duplicated and never empty. */
  headers: string[];
  /** Data rows (at most `maxRows`), keyed by header. Missing cells are `''`. */
  rows: CsvRow[];
  /** Number of non-empty data rows in the document, including any dropped past `maxRows`. */
  totalRows: number;
  /** True when `totalRows` exceeds the rows kept. */
  truncated: boolean;
}

/** Options for {@link parseCsv}. */
export interface ParseCsvOptions {
  /** Field delimiter. Defaults to `,`. */
  delimiter?: string;
  /** Maximum data rows to keep. Defaults to {@link MAX_BULK_CSV_ROWS}. */
  maxRows?: number;
}

/** Thrown when the CSV text cannot be parsed (unterminated quote, oversize input). */
export class CsvParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CsvParseError';
  }
}

const QUOTE = '"';

/**
 * Splits CSV text into records of raw fields following RFC 4180: fields may be
 * quoted, `""` inside quotes is a literal quote, and quoted fields may contain
 * delimiters and line breaks. CRLF, LF and lone CR all end a record. Text after a
 * closing quote is kept literally rather than rejected.
 */
function tokenize(text: string, delimiter: string, onRecord: (fields: string[]) => void): void {
  let field = '';
  let fields: string[] = [];
  let inQuotes = false;
  let quoteStartLine = 1;
  let line = 1;
  let i = 0;
  const n = text.length;

  const endRecord = () => {
    fields.push(field);
    onRecord(fields);
    fields = [];
    field = '';
  };

  while (i < n) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === QUOTE) {
        if (text[i + 1] === QUOTE) {
          field += QUOTE;
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      if (ch === '\n' || (ch === '\r' && text[i + 1] !== '\n')) line += 1;
      field += ch;
      i += 1;
      continue;
    }

    if (ch === QUOTE && field.length === 0) {
      inQuotes = true;
      quoteStartLine = line;
      i += 1;
    } else if (ch === delimiter) {
      fields.push(field);
      field = '';
      i += 1;
    } else if (ch === '\r' || ch === '\n') {
      endRecord();
      line += 1;
      i += ch === '\r' && text[i + 1] === '\n' ? 2 : 1;
    } else {
      field += ch;
      i += 1;
    }
  }

  if (inQuotes) {
    throw new CsvParseError(`Unterminated quoted field starting on line ${quoteStartLine}.`);
  }
  // A trailing line break already closed the last record.
  if (field.length > 0 || fields.length > 0) endRecord();
}

function isBlankRecord(fields: string[]): boolean {
  return fields.every((f) => f.trim() === '');
}

function normalizeHeaders(raw: string[]): string[] {
  const seen = new Set<string>();
  return raw.map((value, index) => {
    const base = value.trim() || `Column ${index + 1}`;
    let name = base;
    let suffix = 2;
    while (seen.has(name)) {
      name = `${base}_${suffix}`;
      suffix += 1;
    }
    seen.add(name);
    return name;
  });
}

/**
 * Parses CSV text whose first non-blank record is the header row. A UTF-8 byte
 * order mark is stripped and blank lines are skipped. Only the first `maxRows`
 * data rows are kept so memory stays bounded; the rest are only counted.
 * @throws {CsvParseError} on an unterminated quoted field or input over {@link MAX_BULK_CSV_CHARS}.
 */
export function parseCsv(text: string, options: ParseCsvOptions = {}): CsvTable {
  const delimiter = options.delimiter ?? ',';
  const maxRows = Math.max(0, options.maxRows ?? MAX_BULK_CSV_ROWS);
  if (delimiter.length !== 1 || delimiter === QUOTE || delimiter === '\r' || delimiter === '\n') {
    throw new CsvParseError('The delimiter must be a single character other than a quote or line break.');
  }
  if (text.length > MAX_BULK_CSV_CHARS) {
    throw new CsvParseError(`The CSV is too large (limit ${MAX_BULK_CSV_CHARS} characters).`);
  }

  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  let headers: string[] | null = null;
  const rows: CsvRow[] = [];
  let totalRows = 0;

  tokenize(source, delimiter, (fields) => {
    if (isBlankRecord(fields)) return;
    if (headers === null) {
      headers = normalizeHeaders(fields);
      return;
    }
    totalRows += 1;
    if (rows.length >= maxRows) return;
    const row: CsvRow = {};
    headers.forEach((header, index) => {
      row[header] = fields[index] ?? '';
    });
    rows.push(row);
  });

  return { headers: headers ?? [], rows, totalRows, truncated: totalRows > rows.length };
}
