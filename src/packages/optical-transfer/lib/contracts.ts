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

import { QRConfig } from '@/types';

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
 * Real-time transfer statistics and metrics.
 */
export interface TransferStats {
  fileName: string;
  fileSize: number;
  startTime: number;
  activeMemory: string;
}

/**
 * High-performance frame data delivered to renderers and consumers.
 */
export interface StreamFrame {
  index: number;
  size: number;
  data: Uint8Array;
  isHandshake?: boolean;
}

/**
 * Configuration options for the headless sender session.
 */
export interface SenderSessionOptions {
  config: QRConfig;
  chunkSize?: number;
  fps?: number;
  fountainMode?: boolean;
}

/**
 * Configuration options for the headless receiver session.
 */
export interface ReceiverSessionOptions {
  handshakeRequired?: boolean;
  streamMode?: 'text' | 'binary';
  autoDownload?: boolean;
  onProgress?: (percent: number, current: number, total: number | null) => void;
  onSuccess?: (data: Uint8Array, handshake: HandshakeInfo | null) => void;
  onError?: (error: string) => void;
  onSecurityAlert?: (message: string) => void;
}

