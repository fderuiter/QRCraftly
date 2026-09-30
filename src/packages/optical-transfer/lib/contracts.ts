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

import type { TransferCompression } from './fountain/session';

/**
 * Handshake metadata exchanged at the beginning of legacy streams or derived from droplet headers.
 */
export interface HandshakeInfo {
  fileName: string;
  fileSize: number;
  mimeType: string;
  sha256: string;
}

/**
 * Sender telemetry shown while a transfer plays.
 */
export interface TransferStats {
  fileName: string;
  fileSize: number;
  startTime: number;
  /** Size of the preallocated frame pool buffer, formatted in megabytes. */
  frameBufferMemory: string;
}

/** START payload accepted by the slice worker. */
export interface SliceStartPayload {
  file?: Blob;
  chunkSize?: number;
  errorCorrectionLevel?: string;
  fps?: number;
  /** Rateless BC-UR fountain broadcast (default in `useOpticalSender`). */
  fountainMode?: boolean;
}

/** Messages the slice worker accepts. */
export type SliceWorkerIncomingMessage =
  | { type: 'START'; payload?: SliceStartPayload }
  | { type: 'ACK'; payload?: { index?: number } }
  | { type: 'HEAL'; payload?: { lastAckedIndex?: unknown } }
  | { type: 'STOP' };

/** Fountain session details reported on INITIALIZED. */
export interface FountainInitInfo {
  k: number;
  symbolSize: number;
  compression: TransferCompression;
  messageLength: number;
}

/** Messages the slice worker emits. */
export type SliceWorkerOutgoingMessage =
  | { type: 'FRAME'; index: number; total: number; size: number; data: Uint8Array }
  | { type: 'PROGRESS'; index: number; total: number; fileName?: string; fileSize?: number }
  | { type: 'INITIALIZED'; totalFrames: number; chunkSize: number; sha256: string; fountain: FountainInitInfo | null }
  | { type: 'COMPLETE' }
  | { type: 'ERROR'; message: string };
