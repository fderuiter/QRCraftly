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

export const SYNC_FREQ = 1500;
export const ZERO_FREQ = 1200;
export const ONE_FREQ = 2200;
export const AMPLITUDE_THRESHOLD = 135;
export const BIT_TOLERANCE = 4;

interface FskInitRequest {
  type: 'init';
  sampleRate: number;
  fftSize: number;
}

interface FskProcessRequest {
  type: 'process';
  buffer: ArrayBuffer;
}

interface FskResetRequest {
  type: 'reset';
}

export type FskWorkerRequest = FskInitRequest | FskProcessRequest | FskResetRequest;

export interface FskProcessResponse {
  type: 'fsk_response';
  symbol: string;
  decodedMessage?: string;
  logs?: string[];
  buffer: ArrayBuffer;
}

export type FskWorkerResponse = FskProcessResponse;

/**
 * Type-guard for FSK Worker Requests.
 */
export function isFskWorkerRequest(data: unknown): data is FskWorkerRequest {
  if (typeof data !== 'object' || data === null) return false;
  const req = data as any;
  if (req.type === 'init') {
    return typeof req.sampleRate === 'number' && Number.isFinite(req.sampleRate) && req.sampleRate > 0 &&
           typeof req.fftSize === 'number' && Number.isFinite(req.fftSize) && req.fftSize > 0;
  }
  if (req.type === 'process') {
    return req.buffer instanceof ArrayBuffer;
  }
  if (req.type === 'reset') {
    return true;
  }
  return false;
}

/**
 * Assertion function for FSK Worker Requests.
 */
export function assertFskWorkerRequest(data: unknown): asserts data is FskWorkerRequest {
  if (typeof data !== 'object' || data === null) {
    throw new Error('FSK Worker request must be a non-null object');
  }
  const req = data as any;
  if (req.type === 'init') {
    if (typeof req.sampleRate !== 'number' || !Number.isFinite(req.sampleRate) || req.sampleRate <= 0) {
      throw new Error('FSK Worker init request sampleRate must be a positive number');
    }
    if (typeof req.fftSize !== 'number' || !Number.isFinite(req.fftSize) || req.fftSize <= 0) {
      throw new Error('FSK Worker init request fftSize must be a positive number');
    }
    return;
  }
  if (req.type === 'process') {
    if (!(req.buffer instanceof ArrayBuffer)) {
      throw new Error('FSK Worker process request buffer must be an ArrayBuffer');
    }
    return;
  }
  if (req.type === 'reset') {
    return;
  }
  throw new Error('FSK Worker request must have a valid type ("init", "process", or "reset")');
}

/**
 * Type-guard for FSK Worker Responses.
 */
export function isFskWorkerResponse(data: unknown): data is FskWorkerResponse {
  if (typeof data !== 'object' || data === null) return false;
  const res = data as any;
  if (res.type === 'fsk_response') {
    if (typeof res.symbol !== 'string') return false;
    if (!(res.buffer instanceof ArrayBuffer)) return false;
    if (res.decodedMessage !== undefined && typeof res.decodedMessage !== 'string') return false;
    if (res.logs !== undefined && !Array.isArray(res.logs)) return false;
    return true;
  }
  return false;
}

/**
 * Assertion function for FSK Worker Responses.
 */
export function assertFskWorkerResponse(data: unknown): asserts data is FskWorkerResponse {
  if (typeof data !== 'object' || data === null) {
    throw new Error('FSK Worker response must be a non-null object');
  }
  const res = data as any;
  if (res.type !== 'fsk_response') {
    throw new Error('FSK Worker response type must be "fsk_response"');
  }
  if (typeof res.symbol !== 'string') {
    throw new Error('FSK Worker response symbol must be a string');
  }
  if (!(res.buffer instanceof ArrayBuffer)) {
    throw new Error('FSK Worker response buffer must be an ArrayBuffer');
  }
  if (res.decodedMessage !== undefined && typeof res.decodedMessage !== 'string') {
    throw new Error('FSK Worker response decodedMessage must be a string if provided');
  }
  if (res.logs !== undefined && !Array.isArray(res.logs)) {
    throw new Error('FSK Worker response logs must be an array of strings if provided');
  }
}
