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

import { parseCsv } from './lib/csvParser';
import { renderBatch } from './lib/batchRenderer';
import {
  isBulkCsvRequest,
  BulkCsvProgressResponse,
  BulkCsvCompleteResponse,
  BulkCsvErrorResponse,
} from './lib/contract';

interface WorkerScope {
  postMessage(message: unknown, transfer?: Transferable[]): void;
}

let activeId: string | null = null;
let isCancelled = false;

self.addEventListener('message', async (event: MessageEvent) => {
  const data = event.data;
  if (!isBulkCsvRequest(data)) return;

  if (data.type === 'CANCEL') {
    if (data.id === activeId) {
      isCancelled = true;
    }
    return;
  }

  if (data.type === 'START') {
    activeId = data.id;
    isCancelled = false;

    try {
      const parsed = parseCsv(data.csvText);
      if (parsed.rows.length === 0) {
        const errRes: BulkCsvErrorResponse = {
          type: 'ERROR',
          id: data.id,
          error: 'CSV file contains no readable data rows.',
        };
        (self as unknown as WorkerScope).postMessage(errRes);
        return;
      }

      const zipData = await renderBatch({
        csvRows: parsed.rows,
        config: data.config,
        options: data.options,
        onProgress: (processed, total, currentFilename) => {
          const progRes: BulkCsvProgressResponse = {
            type: 'PROGRESS',
            id: data.id,
            processed,
            total,
            currentFilename,
          };
          (self as unknown as WorkerScope).postMessage(progRes);
        },
        isCancelled: () => isCancelled || activeId !== data.id,
      });

      if (isCancelled || activeId !== data.id) {
        return;
      }

      const completeRes: BulkCsvCompleteResponse = {
        type: 'COMPLETE',
        id: data.id,
        zipData,
        filename: 'qr_codes_bulk.zip',
        totalCount: Math.min(parsed.rows.length, data.options.maxRows ?? 1000),
      };

      // Transfer ArrayBuffer for zero-copy efficiency
      (self as unknown as WorkerScope).postMessage(completeRes, [zipData.buffer]);
    } catch (err) {
      if (isCancelled || activeId !== data.id) {
        return;
      }

      const errorMessage = err instanceof Error ? err.message : String(err);
      const errRes: BulkCsvErrorResponse = {
        type: 'ERROR',
        id: data.id,
        error: errorMessage,
      };
      (self as unknown as WorkerScope).postMessage(errRes);
    } finally {
      if (activeId === data.id) {
        activeId = null;
        isCancelled = false;
      }
    }
  }
});
