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

import { createTrackedObjectURL, revokeTrackedObjectURL, calculateAspectBounds } from './imageLoaderUtils';

// Persistent module-level cached canvas and context for main thread fallback to prevent GC/memory allocation churn
let mainThreadCachedCanvas: HTMLCanvasElement | null = null;
let mainThreadCachedCtx: CanvasRenderingContext2D | null = null;

const getRecycledMainThreadCanvas = (width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } => {
  if (typeof document === 'undefined') {
    throw new Error('Canvas fallback is only available in browser environments');
  }
  if (!mainThreadCachedCanvas) {
    mainThreadCachedCanvas = document.createElement('canvas');
  }
  mainThreadCachedCanvas.width = width;
  mainThreadCachedCanvas.height = height;
  mainThreadCachedCtx = mainThreadCachedCanvas.getContext('2d');
  if (!mainThreadCachedCtx) {
    throw new Error('Failed to get 2D context on main thread');
  }
  mainThreadCachedCtx.clearRect(0, 0, width, height);
  return { canvas: mainThreadCachedCanvas, ctx: mainThreadCachedCtx };
};

/**
 * Checks whether the current device is considered a low-tier hardware device
 * based on hardwareConcurrency and deviceMemory.
 */
export const isLowTierDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;

  // Rule 1: Check hardwareConcurrency (< 4 is low-tier)
  if (typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency < 4) {
    return true;
  }

  // Rule 2: Check deviceMemory (< 4 GB is low-tier)
  if ('deviceMemory' in navigator && typeof (navigator as any).deviceMemory === 'number' && (navigator as any).deviceMemory < 4) {
    return true;
  }

  return false;
};

/**
 * Determines whether off-thread bitmap rendering / worker is supported by the environment.
 */
export const isOffThreadSupported = (): boolean => {
  return typeof window !== 'undefined' &&
    'Worker' in window &&
    'OffscreenCanvas' in window &&
    'createImageBitmap' in window;
};

/**
 * Resizes a raster image on a background worker thread.
 */
export const processImageOffThread = (file: File | Blob, maxDim: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    let worker: Worker | null = null;
    try {
      worker = new Worker(new URL('./imageResizeWorker.ts', import.meta.url), { type: 'module' });

      worker.onmessage = (e) => {
        if (e.data.success) {
          if (e.data.dataUrl) {
            resolve(e.data.dataUrl);
          } else if (e.data.blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              resolve(event.target?.result as string);
            };
            reader.onerror = () => {
              reject(new Error('Failed to convert blob to data url on main thread'));
            };
            reader.readAsDataURL(e.data.blob);
          } else {
            reject(new Error('Invalid worker response structure'));
          }
        } else {
          reject(new Error(e.data.error || 'Worker resize failed'));
        }
        worker?.terminate();
      };

      worker.onerror = (err) => {
        reject(err);
        worker?.terminate();
      };

      worker.postMessage({ file, maxDim });
    } catch (err) {
      if (worker) {
        try {
          worker.terminate();
        } catch {}
      }
      reject(err);
    }
  });
};

/**
 * Fallback to resize raster image on the main thread using recycled canvas context.
 */
export const processImageOnMainThread = (file: File | Blob, maxDim: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = createTrackedObjectURL(file) || (typeof URL !== 'undefined' ? URL.createObjectURL(file) : '');

    img.onload = () => {
      revokeTrackedObjectURL(objectUrl);
      const originalWidth = img.naturalWidth || img.width;
      const originalHeight = img.naturalHeight || img.height;

      const { width, height } = calculateAspectBounds(originalWidth, originalHeight, maxDim);

      try {
        const { canvas, ctx } = getRecycledMainThreadCanvas(width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Export as optimized WebP image
        let dataUrl = canvas.toDataURL('image/webp', 0.8);
        if (!dataUrl.startsWith('data:image/webp')) {
          // Fallback if browser doesn't support WebP canvas export
          dataUrl = canvas.toDataURL('image/png');
        }
        resolve(dataUrl);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (err) => {
      revokeTrackedObjectURL(objectUrl);
      reject(err);
    };

    img.src = objectUrl;
  });
};
