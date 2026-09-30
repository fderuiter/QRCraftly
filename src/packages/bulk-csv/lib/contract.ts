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

import { QRConfig } from '@/types';

/** Export file formats supported by the bulk CSV generator. */
export type BulkCsvFormat = 'svg' | 'png';

/** Configuration options for bulk CSV batch processing. */
export interface BulkCsvOptions {
  /** CSV column name to use as the encoded QR value payload. */
  payloadColumn: string;
  /** Optional CSV column name to use for generated image filenames. */
  filenameColumn?: string;
  /** File format for generated QR codes ('svg' or 'png'). Defaults to 'svg'. */
  format?: BulkCsvFormat;
  /** Maximum number of records allowed to process in one batch (default 1000). */
  maxRows?: number;
}

/** Request message sent to start batch generation. */
export interface BulkCsvStartRequest {
  type: 'START';
  id: string;
  csvText: string;
  config: QRConfig;
  options: BulkCsvOptions;
}

/** Request message sent to cancel active batch processing. */
export interface BulkCsvCancelRequest {
  type: 'CANCEL';
  id: string;
}

export type BulkCsvRequest = BulkCsvStartRequest | BulkCsvCancelRequest;

/** Response message emitted during progress updates. */
export interface BulkCsvProgressResponse {
  type: 'PROGRESS';
  id: string;
  processed: number;
  total: number;
  currentFilename: string;
}

/** Response message emitted when batch generation finishes successfully. */
export interface BulkCsvCompleteResponse {
  type: 'COMPLETE';
  id: string;
  zipData: Uint8Array;
  filename: string;
  totalCount: number;
}

/** Response message emitted when an unhandled error occurs. */
export interface BulkCsvErrorResponse {
  type: 'ERROR';
  id: string;
  error: string;
}

export type BulkCsvResponse = BulkCsvProgressResponse | BulkCsvCompleteResponse | BulkCsvErrorResponse;

/** Type guard verifying if a message is a valid BulkCsvRequest. */
export function isBulkCsvRequest(msg: unknown): msg is BulkCsvRequest {
  if (typeof msg !== 'object' || msg === null) return false;
  const req = msg as Record<string, unknown>;
  return (req.type === 'START' || req.type === 'CANCEL') && typeof req.id === 'string';
}

/** Type guard verifying if a message is a valid BulkCsvResponse. */
export function isBulkCsvResponse(msg: unknown): msg is BulkCsvResponse {
  if (typeof msg !== 'object' || msg === null) return false;
  const res = msg as Record<string, unknown>;
  return (
    (res.type === 'PROGRESS' || res.type === 'COMPLETE' || res.type === 'ERROR') &&
    typeof res.id === 'string'
  );
}
