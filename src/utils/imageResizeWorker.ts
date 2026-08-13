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

let cachedCanvas: OffscreenCanvas | null = null;
let cachedCtx: OffscreenCanvasRenderingContext2D | null = null;

self.onmessage = async (e: MessageEvent<{ file: Blob | File; maxDim: number }>) => {
  const { file, maxDim } = e.data;

  try {
    if (!file) {
      throw new Error('No file provided');
    }

    // Decode off-thread using createImageBitmap
    const bitmap = await createImageBitmap(file);
    const originalWidth = bitmap.width;
    const originalHeight = bitmap.height;

    // Calculate dynamic clamped dimensions
    let width = originalWidth;
    let height = originalHeight;
    if (width > maxDim || height > maxDim) {
      const ratio = Math.min(maxDim / width, maxDim / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    // Recycle/re-use the OffscreenCanvas context to prevent GC/memory churn
    if (!cachedCanvas) {
      cachedCanvas = new OffscreenCanvas(width, height);
      cachedCtx = cachedCanvas.getContext('2d');
    } else {
      cachedCanvas.width = width;
      cachedCanvas.height = height;
      cachedCtx = cachedCanvas.getContext('2d');
    }

    if (!cachedCtx) {
      throw new Error('Failed to get 2D context from OffscreenCanvas');
    }

    // Clear canvas before drawing (optional but good practice when recycling)
    cachedCtx.clearRect(0, 0, width, height);

    // Draw the bitmap on the recycled canvas
    cachedCtx.drawImage(bitmap, 0, 0, width, height);

    // Explicitly close the bitmap immediately to free GPU/heap memory
    bitmap.close();

    // Export as optimized WebP output
    let blob: Blob;
    try {
      blob = await cachedCanvas.convertToBlob({ type: 'image/webp', quality: 0.8 });
    } catch {
      // Fallback if image/webp is not supported by convertToBlob in the browser
      blob = await cachedCanvas.convertToBlob({ type: 'image/png' });
    }

    // Convert blob to Data URL off-thread using FileReaderSync
    let dataUrl: string;
    const FileReaderSyncClass = (self as any).FileReaderSync;
    if (typeof FileReaderSyncClass !== 'undefined') {
      const reader = new FileReaderSyncClass();
      dataUrl = reader.readAsDataURL(blob);
    } else {
      // In case FileReaderSync is not available, return blob and convert on main thread
      self.postMessage({ success: true, blob });
      return;
    }

    self.postMessage({ success: true, dataUrl });
  } catch (error: any) {
    self.postMessage({ success: false, error: error?.message || 'Error resizing image' });
  }
};
