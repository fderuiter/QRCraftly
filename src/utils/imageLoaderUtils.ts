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

/**
 * Parsed dimension metadata for image assets.
 */
export interface ImageDimensions {
  /** The natural width of the image in pixels. */
  width: number;
  /** The natural height of the image in pixels. */
  height: number;
  /** The aspect ratio of the image (width / height). */
  aspectRatio: number;
}

/**
 * Bounds constraints for image resizing or scaling.
 */
export interface DimensionBounds {
  /** Maximum allowable width. */
  maxWidth?: number;
  /** Maximum allowable height. */
  maxHeight?: number;
}

// Global registry for object URLs created during image operations
const trackedObjectUrls = new Set<string>();

/**
 * Creates a Blob Object URL and registers it for memory lifecycle management.
 * @param blob - The File or Blob to create an Object URL for.
 * @returns The generated blob URL string or empty string if URL API is unsupported.
 */
export const createTrackedObjectURL = (blob: Blob | File): string => {
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return '';
  }
  const url = URL.createObjectURL(blob);
  if (url) {
    trackedObjectUrls.add(url);
  }
  return url;
};

/**
 * Revokes a registered Object URL synchronously to prevent memory leaks.
 * @param url - The blob URL string to revoke.
 */
export const revokeTrackedObjectURL = (url: string | null | undefined): void => {
  if (!url || typeof URL === 'undefined' || typeof URL.revokeObjectURL !== 'function') {
    return;
  }
  if (url.startsWith('blob:') || trackedObjectUrls.has(url)) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // Defensive fallback for environments where URL.revokeObjectURL throws
    }
    trackedObjectUrls.delete(url);
  }
};

/**
 * Synchronously revokes all actively tracked Object URLs.
 */
export const revokeAllTrackedObjectURLs = (): void => {
  if (typeof URL === 'undefined' || typeof URL.revokeObjectURL !== 'function') {
    trackedObjectUrls.clear();
    return;
  }
  for (const url of trackedObjectUrls) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // Ignore errors during batch cleanup
    }
  }
  trackedObjectUrls.clear();
};

/**
 * Calculates aspect-ratio-preserving dimensions when downscaling an image to fit target bounds.
 * @param width - Original image width.
 * @param height - Original image height.
 * @param maxDim - Target bounding constraint as a max dimension number or bounds object.
 * @returns Calculated dimensions maintaining proportional aspect ratio.
 */
export const calculateAspectBounds = (
  width: number,
  height: number,
  maxDim: number | DimensionBounds
): ImageDimensions => {
  if (width <= 0 || height <= 0 || !Number.isFinite(width) || !Number.isFinite(height)) {
    return { width: 0, height: 0, aspectRatio: 1 };
  }

  const aspectRatio = width / height;

  let maxWidth: number | undefined;
  let maxHeight: number | undefined;

  if (typeof maxDim === 'number') {
    maxWidth = maxDim;
    maxHeight = maxDim;
  } else {
    maxWidth = maxDim.maxWidth;
    maxHeight = maxDim.maxHeight;
  }

  let targetWidth = width;
  let targetHeight = height;

  const widthScale = maxWidth && maxWidth > 0 && targetWidth > maxWidth ? maxWidth / targetWidth : 1;
  const heightScale = maxHeight && maxHeight > 0 && targetHeight > maxHeight ? maxHeight / targetHeight : 1;
  const scale = Math.min(widthScale, heightScale);

  if (scale < 1) {
    targetWidth = Math.round(targetWidth * scale);
    targetHeight = Math.round(targetHeight * scale);
  }

  return {
    width: targetWidth,
    height: targetHeight,
    aspectRatio
  };
};

/**
 * Parses natural dimensions from raw SVG string content (via viewBox or width/height attributes).
 * @param svgText - Raw text content of the SVG file.
 * @returns Parsed dimensions or null if SVG metadata is unparseable.
 */
export const parseSvgDimensions = (svgText: string): ImageDimensions | null => {
  try {
    const viewBoxMatch = svgText.match(/viewBox=["']\s*([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s*["']/i);
    if (viewBoxMatch) {
      const vbWidth = parseFloat(viewBoxMatch[3]);
      const vbHeight = parseFloat(viewBoxMatch[4]);
      if (vbWidth > 0 && vbHeight > 0) {
        return {
          width: vbWidth,
          height: vbHeight,
          aspectRatio: vbWidth / vbHeight
        };
      }
    }

    const widthMatch = svgText.match(/width=["']\s*([\d.-]+)(?:px)?\s*["']/i);
    const heightMatch = svgText.match(/height=["']\s*([\d.-]+)(?:px)?\s*["']/i);

    if (widthMatch && heightMatch) {
      const w = parseFloat(widthMatch[1]);
      const h = parseFloat(heightMatch[1]);
      if (w > 0 && h > 0) {
        return {
          width: w,
          height: h,
          aspectRatio: w / h
        };
      }
    }
  } catch {
    // Return null if regex or parsing fails
  }
  return null;
};

/**
 * Probes exact natural dimensions for raster or vector image assets (URL, File, or Blob).
 * @param src - The image asset source (data URL, http URL, File, or Blob).
 * @returns Promise resolving to probed image dimension metadata.
 */
export const probeImageDimensions = (src: string | File | Blob): Promise<ImageDimensions> => {
  return new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error('Invalid image source provided for dimension probing'));
      return;
    }

    // Handle SVG File/Blob parsing if possible
    if (typeof File !== 'undefined' && src instanceof File && (src.type === 'image/svg+xml' || src.name.toLowerCase().endsWith('.svg'))) {
      if (typeof FileReader !== 'undefined') {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          const dims = parseSvgDimensions(content);
          if (dims) {
            resolve(dims);
            return;
          }
          // Fallback to Image element probing if text parsing didn't find dimensions
          probeWithImageElement(src, resolve, reject);
        };
        reader.onerror = () => probeWithImageElement(src, resolve, reject);
        reader.readAsText(src);
        return;
      }
    }

    probeWithImageElement(src, resolve, reject);
  });
};

/**
 * Internal helper to probe natural dimensions using an HTMLImageElement.
 * @param src - Source asset string or Blob/File.
 * @param resolve - Promise resolve handler.
 * @param reject - Promise reject handler.
 */
const probeWithImageElement = (
  src: string | File | Blob,
  resolve: (dims: ImageDimensions) => void,
  reject: (err: Error) => void
): void => {
  let objectUrl = '';
  let imgUrl = '';

  if (typeof Blob !== 'undefined' && src instanceof Blob) {
    objectUrl = createTrackedObjectURL(src);
    imgUrl = objectUrl;
  } else if (typeof src === 'string') {
    imgUrl = src;
  } else {
    reject(new Error('Unsupported image source type'));
    return;
  }

  if (!imgUrl) {
    reject(new Error('Failed to create object URL for image probing'));
    return;
  }

  const img = new Image();
  if (typeof src === 'string' && !src.startsWith('data:')) {
    img.crossOrigin = 'Anonymous';
  }

  const cleanup = () => {
    img.onload = null;
    img.onerror = null;
    if (objectUrl) {
      revokeTrackedObjectURL(objectUrl);
    }
  };

  img.onload = () => {
    const width = img.naturalWidth || img.width || 0;
    const height = img.naturalHeight || img.height || 0;

    cleanup();

    if (width <= 0 || height <= 0) {
      reject(new Error('Invalid image dimensions probed'));
      return;
    }

    resolve({
      width,
      height,
      aspectRatio: width / height
    });
  };

  img.onerror = () => {
    cleanup();
    reject(new Error('Failed to load image asset for dimension probing'));
  };

  img.src = imgUrl;
};
