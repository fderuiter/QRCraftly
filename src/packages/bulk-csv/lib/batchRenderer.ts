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

import JSZip from 'jszip';
import { QRConfig } from '@/types';
import { buildMatrix, loadQrEncoder } from '@/packages/qr-matrix';
import { SvgContext, drawWithTemplate, SOCIAL_DIMENSIONS } from '@/packages/qr-export';
import { sanitizeSvg } from '@/utils/security';
import { BulkCsvOptions } from './contract';

/**
 * Sanitizes a string for use as a safe filename inside a ZIP archive.
 */
export function sanitizeFilename(raw: string): string {
  const cleaned = raw.replace(/[/\\?%*:|"<>]/g, '_').replace(/\s+/g, ' ').trim();
  if (!cleaned || /^_+$/.test(cleaned)) {
    return 'qr_code';
  }
  return cleaned;
}

export interface RenderBatchOptions {
  csvRows: Record<string, string>[];
  config: QRConfig;
  options: BulkCsvOptions;
  onProgress?: (processed: number, total: number, currentFilename: string) => void;
  isCancelled?: () => boolean;
}

/**
 * Renders a batch of QR codes off-thread and bundles them into a JSZip archive.
 * Supports vector SVG strings and OffscreenCanvas image frames.
 *
 * @param params - Batch rendering settings and callbacks.
 * @returns Uint8Array containing the completed ZIP archive binary data.
 */
export async function renderBatch({
  csvRows,
  config,
  options,
  onProgress,
  isCancelled,
}: RenderBatchOptions): Promise<Uint8Array> {
  const zip = new JSZip();
  const encoder = await loadQrEncoder();

  const max = options.maxRows ?? 1000;
  const rowsToProcess = csvRows.slice(0, max);
  const total = rowsToProcess.length;

  const payloadCol = options.payloadColumn;
  const filenameCol = options.filenameColumn;
  const format = options.format || 'svg';

  const canUseOffscreenCanvas = typeof OffscreenCanvas !== 'undefined' && format === 'png';
  const dimensions = SOCIAL_DIMENSIONS[config.socialFormat] || { width: 1000, height: 1000 };

  let offscreenCanvas: OffscreenCanvas | null = null;
  let offscreenCtx: OffscreenCanvasRenderingContext2D | null = null;

  if (canUseOffscreenCanvas) {
    try {
      offscreenCanvas = new OffscreenCanvas(dimensions.width, dimensions.height);
      offscreenCtx = offscreenCanvas.getContext('2d');
    } catch {
      offscreenCanvas = null;
      offscreenCtx = null;
    }
  }

  const usedFilenames = new Map<string, number>();

  for (let i = 0; i < total; i++) {
    if (isCancelled && isCancelled()) {
      throw new Error('Batch processing cancelled by user.');
    }

    const row = rowsToProcess[i];
    const rawPayload = row[payloadCol] ?? '';

    // Derive raw filename
    const rawName = filenameCol && row[filenameCol] ? row[filenameCol] : `qr_${i + 1}`;
    let safeName = sanitizeFilename(rawName);

    // Ensure unique filenames within zip
    if (usedFilenames.has(safeName)) {
      const count = usedFilenames.get(safeName)! + 1;
      usedFilenames.set(safeName, count);
      safeName = `${safeName}_${count}`;
    } else {
      usedFilenames.set(safeName, 1);
    }

    const rowConfig: QRConfig = {
      ...config,
      value: rawPayload,
    };

    const modules = buildMatrix(rowConfig, encoder);
    const moduleCount = modules.size;

    if (canUseOffscreenCanvas && offscreenCanvas && offscreenCtx) {
      // Clear offscreen canvas
      offscreenCtx.clearRect(0, 0, dimensions.width, dimensions.height);

      drawWithTemplate(
        offscreenCtx as unknown as CanvasRenderingContext2D,
        modules,
        rowConfig,
        null,
        null,
        dimensions.width,
        dimensions.height,
        moduleCount,
        true
      );

      const blob = await offscreenCanvas.convertToBlob({ type: 'image/png' });
      const buffer = await blob.arrayBuffer();
      const filename = `${safeName}.png`;
      zip.file(filename, buffer);

      if (onProgress) {
        onProgress(i + 1, total, filename);
      }
    } else {
      // Render SVG string
      const svgCtx = new SvgContext(
        dimensions.width,
        dimensions.height,
        `QR Code ${i + 1}`,
        rawPayload
      );

      drawWithTemplate(
        svgCtx as unknown as CanvasRenderingContext2D,
        modules,
        rowConfig,
        null,
        null,
        dimensions.width,
        dimensions.height,
        moduleCount,
        true
      );

      const rawSvg = svgCtx.serialize();
      const svgContent = typeof DOMParser !== 'undefined' ? sanitizeSvg(rawSvg) : rawSvg;
      const filename = `${safeName}.svg`;
      zip.file(filename, svgContent);

      if (onProgress) {
        onProgress(i + 1, total, filename);
      }
    }
  }

  if (isCancelled && isCancelled()) {
    throw new Error('Batch processing cancelled by user.');
  }

  const zipData = await zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return zipData;
}
