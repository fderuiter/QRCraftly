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
import {
  BulkCsvOptions,
  BulkCsvStartRequest,
  BulkCsvCancelRequest,
  isBulkCsvResponse,
} from './contract';

export interface BatchHandlers {
  onProgress?: (processed: number, total: number, currentFilename: string) => void;
  onComplete: (zipData: Uint8Array, filename: string, totalCount: number) => void;
  onError: (error: string) => void;
}

export interface BulkCsvWorkerHandle {
  startBatch: (csvText: string, config: QRConfig, options: BulkCsvOptions, handlers: BatchHandlers) => void;
  cancelBatch: () => void;
  terminate: () => void;
}

/**
 * Spawns a dedicated Bulk CSV Web Worker.
 *
 * @returns The Worker instance, or null if Web Workers are unavailable (e.g. SSR).
 */
export function createBulkCsvWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  try {
    return new Worker(new URL('../worker.ts', import.meta.url), { type: 'module' });
  } catch (err) {
    console.error('Failed to spawn the Bulk CSV Worker:', err);
    return null;
  }
}

/**
 * Creates a managed worker handle that manages job lifecycles and message handlers.
 *
 * @param worker - An optional pre-created worker, or creates a new one by default.
 * @returns BulkCsvWorkerHandle interface.
 */
export function connectBulkCsvWorker(worker: Worker | null = createBulkCsvWorker()): BulkCsvWorkerHandle {
  let activeId: string | null = null;

  return {
    startBatch(csvText, config, options, handlers) {
      if (!worker) {
        handlers.onError('Web Workers are not supported in this environment.');
        return;
      }

      const reqId = `bulk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      activeId = reqId;

      const messageHandler = (event: MessageEvent) => {
        const data = event.data;
        if (!isBulkCsvResponse(data) || data.id !== reqId) return;

        if (data.type === 'PROGRESS') {
          if (handlers.onProgress) {
            handlers.onProgress(data.processed, data.total, data.currentFilename);
          }
        } else if (data.type === 'COMPLETE') {
          cleanup();
          handlers.onComplete(data.zipData, data.filename, data.totalCount);
        } else if (data.type === 'ERROR') {
          cleanup();
          handlers.onError(data.error);
        }
      };

      const errorHandler = (event: ErrorEvent) => {
        cleanup();
        handlers.onError(event.message || 'Worker thread execution error.');
      };

      const cleanup = () => {
        worker.removeEventListener('message', messageHandler);
        worker.removeEventListener('error', errorHandler);
        if (activeId === reqId) activeId = null;
      };

      worker.addEventListener('message', messageHandler);
      worker.addEventListener('error', errorHandler);

      const startReq: BulkCsvStartRequest = {
        type: 'START',
        id: reqId,
        csvText,
        config,
        options,
      };

      worker.postMessage(startReq);
    },

    cancelBatch() {
      if (worker && activeId) {
        const cancelReq: BulkCsvCancelRequest = {
          type: 'CANCEL',
          id: activeId,
        };
        worker.postMessage(cancelReq);
        activeId = null;
      }
    },

    terminate() {
      if (worker) {
        if (activeId) {
          this.cancelBatch();
        }
        try {
          worker.terminate();
        } catch {}
      }
    },
  };
}
