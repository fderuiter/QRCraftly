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

import { RefObject, useCallback } from 'react';
import { QRConfig, TemplateStyle, SocialFormat } from '../types';
import { generateQRSvg, validateSvgScannability, drawWithTemplate, SOCIAL_DIMENSIONS } from '@/packages/qr-export';
import { drawQRInternal, buildMatrix, loadQrEncoder, generateMaze, type MazeData } from '@/packages/qr-matrix';
import { useCapabilities } from './useCapabilities';
import { performScannabilityCheck } from '../utils/scannabilityChecker';
import { ExportOptions } from '../utils/exportRiskPolicy';

/**
 * Error-like check that also accepts `DOMException`s, which are not `Error` instances in
 * every runtime (jsdom).
 */
const isErrorLike = (value: unknown): value is Error =>
  typeof value === 'object' && value !== null && 'name' in value && 'message' in value;

/** Normalises a caught value so `ExportStatus.error` is always an `Error`. */
const toError = (err: unknown): Error => {
  if (isErrorLike(err)) return err;
  const error = new Error(String(err));
  // Keep the name of plain `{ name }` rejections so callers can still recognise an AbortError.
  if (typeof err === 'object' && err !== null && 'name' in err && typeof err.name === 'string') {
    error.name = err.name;
  }
  return error;
};

export type { ExportOptions };

/**
 * Return type for the useQRDownload hook.
 */
export interface ExportStatus {
  /** Indicates whether the export operation succeeded. */
  success: boolean;
  /** Format of the exported asset. */
  format?: 'png' | 'jpeg' | 'webp' | 'svg' | 'clipboard' | 'share';
  /** Error object if export failed. */
  error?: Error;
  /** Indicates whether a fallback export mechanism was triggered. */
  fallbackTriggered?: boolean;
  /** Indicates whether remote logo was omitted during vector export. */
  logoOmitted?: boolean;
}

/**
 * Return type for the useQRDownload hook.
 */
export interface UseQRDownloadReturn {
  /** Unified seam for all asset exports. */
  exportAsset: (
    format: 'png' | 'jpeg' | 'webp' | 'svg' | 'clipboard' | 'share',
    options?: ExportOptions
  ) => Promise<ExportStatus>;
  /** Downloads the canvas image to local device storage. */
  downloadToDevice: (format: 'png' | 'jpeg' | 'webp', options?: ExportOptions) => Promise<ExportStatus>;
  /** Opens native Save-As file picker if supported, with direct download fallback. */
  handleSaveAs: (format: 'png' | 'jpeg' | 'webp', options?: ExportOptions) => Promise<ExportStatus>;
  /** Generates and downloads vector SVG QR code. */
  handleSaveSvg: (options?: ExportOptions) => Promise<ExportStatus>;
  /** Shares QR code image via Web Share API. */
  handleShare: (options?: ExportOptions) => Promise<ExportStatus>;
  /** Copies QR code image to system clipboard. */
  handleCopy: (options?: ExportOptions) => Promise<ExportStatus>;
}

/** Helper to load image elements asynchronously for offscreen rendering. */
function loadImage(url: string | null | undefined): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
    if (img.complete && img.naturalWidth > 0) {
      resolve(img);
      return;
    }
    const isJsdom = typeof window !== 'undefined' && window.navigator?.userAgent?.includes('jsdom') === true;
    if (isJsdom) {
      setTimeout(() => resolve(img), 0);
    }
  });
}

/** Converts an HTMLCanvasElement or OffscreenCanvas to an image Blob. */
async function getCanvasBlob(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  mimeType: string
): Promise<Blob | null> {
  if ('toBlob' in canvas && typeof (canvas as HTMLCanvasElement).toBlob === 'function') {
    return new Promise((resolve) => (canvas as HTMLCanvasElement).toBlob(resolve, mimeType));
  } else if ('convertToBlob' in canvas && typeof (canvas as OffscreenCanvas).convertToBlob === 'function') {
    return (canvas as OffscreenCanvas).convertToBlob({ type: mimeType });
  }
  return null;
}

/**
 * Renders the QR code onto an offscreen canvas at custom export dimensions.
 */
async function renderOffscreenCanvas(
  config: QRConfig,
  exportSize: number
): Promise<HTMLCanvasElement | OffscreenCanvas | null> {
  const targetWidth = exportSize;
  const useTemplate =
    config.templateStyle !== TemplateStyle.NONE ||
    config.socialFormat !== SocialFormat.SQUARE_1_1;

  let targetHeight = targetWidth;
  if (useTemplate) {
    const { width: fw, height: fh } = SOCIAL_DIMENSIONS[config.socialFormat] || { width: 1080, height: 1080 };
    targetHeight = Math.round((targetWidth * fh) / fw);
  }

  let canvas: HTMLCanvasElement | OffscreenCanvas | null = null;
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;

  if (typeof OffscreenCanvas !== 'undefined') {
    try {
      const offscreen = new OffscreenCanvas(targetWidth, targetHeight);
      const testCtx = offscreen.getContext('2d') as OffscreenCanvasRenderingContext2D | null;
      const canExport = 'convertToBlob' in offscreen || 'toDataURL' in offscreen;
      if (testCtx && typeof testCtx.clearRect === 'function' && typeof testCtx.fillRect === 'function' && canExport) {
        canvas = offscreen;
        ctx = testCtx;
      }
    } catch {
      // Fallback
    }
  }

  if (!canvas && typeof document !== 'undefined' && typeof document.createElement === 'function') {
    try {
      const htmlCanvas = document.createElement('canvas');
      htmlCanvas.width = targetWidth;
      htmlCanvas.height = targetHeight;
      const testCtx = htmlCanvas.getContext('2d');
      if (testCtx && typeof testCtx.clearRect === 'function') {
        canvas = htmlCanvas;
        ctx = testCtx;
      }
    } catch (err) {
      console.warn('Canvas allocation failed, falling back to display canvas:', err);
      return null;
    }
  }

  if (!canvas || !ctx) {
    return null;
  }

  try {
    const encoder = await loadQrEncoder();
    const modules = buildMatrix(config, encoder);
    const logoImg = await loadImage(config.logoUrl);
    const borderLogoImg = config.isBorderEnabled ? await loadImage(config.borderLogoUrl) : null;
    let mazeData: MazeData | null = null;

    if (config.isMazeEnabled) {
      mazeData = generateMaze(modules, config, modules.size);
    }

    ctx.clearRect(0, 0, targetWidth, targetHeight);

    if (useTemplate) {
      drawWithTemplate(
        ctx as unknown as CanvasRenderingContext2D,
        modules,
        config,
        logoImg,
        borderLogoImg,
        targetWidth,
        targetHeight,
        modules.size,
        false,
        mazeData
      );
    } else {
      drawQRInternal(
        ctx as unknown as CanvasRenderingContext2D,
        modules,
        config,
        logoImg,
        borderLogoImg,
        targetWidth,
        modules.size,
        false,
        mazeData
      );
    }

    return canvas;
  } catch (err) {
    console.warn('Offscreen rendering failed, falling back to display canvas:', err);
    return null;
  }
}

/**
 * Hook to handle downloading, sharing, and copying of the QR code.
 * Extracts this logic from the main component to reduce cognitive load.
 * @param qrRef - Reference to the container element containing the canvas.
 * @param config - Current QR configuration (used for filename generation).
 * @returns Object containing download and share handlers.
 */
export function useQRDownload(
  qrRef: RefObject<HTMLDivElement | null>,
  config: QRConfig
): UseQRDownloadReturn {
  const { canSaveFilePicker, canShare } = useCapabilities();

  /**
   * Validates the canvas readability against simulated optical noise.
   * Social templates and decorative poster frames bypass full-canvas matrix decode.
   */
  const validateScannability = useCallback(
    (canvas: HTMLCanvasElement | OffscreenCanvas): boolean => {
      if (config.templateStyle !== TemplateStyle.NONE || config.socialFormat !== SocialFormat.SQUARE_1_1) {
        return true;
      }
      try {
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
        if (!ctx) return false;
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const result = performScannabilityCheck(imageData, canvas.width, canvas.height, true);
        return result.success;
      } catch (err) {
        console.error('Scannability validation failed:', err);
        return false;
      }
    },
    [config.templateStyle, config.socialFormat]
  );

  /**
   * Helper function to normalize file extensions.
   * @param format - The image format ('png', 'jpeg', 'webp').
   * @returns The corresponding file extension (e.g., 'jpg' for 'jpeg').
   */
  const getExtension = (format: 'png' | 'jpeg' | 'webp') => {
    return format === 'jpeg' ? 'jpg' : format;
  };

  /**
   * Generates an SEO-friendly filename based on the current QR code type and date.
   * @param ext - The file extension.
   * @returns The generated filename string.
   */
  const getFilename = useCallback(
    (ext: string) => {
      const type = config.type.toLowerCase();
      const date = new Date().toISOString().split('T')[0];
      return `${type}-qr-code-qrcraftly-${date}.${ext}`;
    },
    [config.type]
  );

  /**
   * Downloads the current QR code canvas content to the user's device.
   * Used as a fallback or direct action for saving to photos.
   * @param format - The desired image format.
   * @param options - Optional export options (e.g. allowUnsafe to bypass scannability pre-flight checks).
   */
  const downloadToDevice = useCallback(
    async (format: 'png' | 'jpeg' | 'webp', options?: ExportOptions): Promise<ExportStatus> => {
      let canvas: HTMLCanvasElement | OffscreenCanvas | null = null;
      if (options?.exportSize) {
        canvas = await renderOffscreenCanvas(config, options.exportSize);
      }
      if (!canvas) {
        canvas = qrRef.current?.querySelector('canvas') || null;
      }

      if (canvas) {
        if (!options?.allowUnsafe && !validateScannability(canvas)) {
          return { success: false, format, error: new Error('SCAN_VALIDATION_FAILED') };
        }
        try {
          const mimeType = `image/${format}`;
          let url: string;
          if ('toDataURL' in canvas && typeof (canvas as HTMLCanvasElement).toDataURL === 'function') {
            url = (canvas as HTMLCanvasElement).toDataURL(mimeType);
          } else {
            const blob = await getCanvasBlob(canvas, mimeType);
            if (!blob) throw new Error('Failed to create image blob');
            url = URL.createObjectURL(blob);
          }
          const link = document.createElement('a');
          const ext = getExtension(format);
          link.download = getFilename(ext);
          link.href = url;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          if (url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
          }
          return { success: true, format };
        } catch (err) {
          return { success: false, format, error: toError(err) };
        }
      }
      return { success: false, format, error: new Error('Canvas not found') };
    },
    [qrRef, config, getFilename, validateScannability]
  );

  /**
   * Handles saving the QR code image, attempting to use the File System Access API
   * for a native "Save As" experience, falling back to direct download if unsupported.
   * @param format - The desired image format.
   * @param options - Optional export options (e.g. allowUnsafe to bypass scannability pre-flight checks).
   */
  const handleSaveAs = useCallback(
    async (format: 'png' | 'jpeg' | 'webp', options?: ExportOptions): Promise<ExportStatus> => {
      let canvas: HTMLCanvasElement | OffscreenCanvas | null = null;
      if (options?.exportSize) {
        canvas = await renderOffscreenCanvas(config, options.exportSize);
      }
      if (!canvas) {
        canvas = qrRef.current?.querySelector('canvas') || null;
      }

      if (!canvas) return { success: false, format, error: new Error('Canvas not found') };

      if (!options?.allowUnsafe && !validateScannability(canvas)) {
        return { success: false, format, error: new Error('SCAN_VALIDATION_FAILED') };
      }

      // Check if the browser supports the File System Access API (e.g., Chrome, Edge Desktop)
      if (canSaveFilePicker) {
        try {
          const mimeType = `image/${format}`;
          const blob = await getCanvasBlob(canvas, mimeType);

          if (!blob) throw new Error('Failed to create image blob');

          const ext = getExtension(format);

          if (!window.showSaveFilePicker) throw new Error('File System Access API unavailable');
          const handle = await window.showSaveFilePicker({
            suggestedName: getFilename(ext),
            types: [
              {
                description: 'QR Code Image',
                accept: { [mimeType]: [`.${ext}`] },
              },
            ],
          });

          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          return { success: true, format };
        } catch (err) {
          // If user aborted the picker, return failure but identify abort.
          if (typeof err === 'object' && err !== null && 'name' in err && err.name === 'AbortError') {
            return { success: false, format, error: toError(err) };
          }

          console.warn('File System Access API failed, falling back to standard download:', err);
          return downloadToDevice(format, options);
        }
      } else {
        // Fallback for browsers that don't support showSaveFilePicker (Safari, Firefox, Mobile)
        return downloadToDevice(format, options);
      }
    },
    [qrRef, config, getFilename, downloadToDevice, canSaveFilePicker, validateScannability]
  );

  /**
   * Copies the QR code image directly to the clipboard.
   * @param options - Optional export options (e.g. allowUnsafe to bypass scannability pre-flight checks).
   * @returns A boolean indicating if the copy operation was successful.
   */
  const handleCopy = useCallback(
    async (options?: ExportOptions): Promise<ExportStatus> => {
      let canvas: HTMLCanvasElement | OffscreenCanvas | null = null;
      if (options?.exportSize) {
        canvas = await renderOffscreenCanvas(config, options.exportSize);
      }
      if (!canvas) {
        canvas = qrRef.current?.querySelector('canvas') || null;
      }

      if (!canvas) return { success: false, format: 'clipboard', error: new Error('Canvas not found') };

      if (!options?.allowUnsafe && !validateScannability(canvas)) {
        return { success: false, format: 'clipboard', error: new Error('SCAN_VALIDATION_FAILED') };
      }

      try {
        const blob = await getCanvasBlob(canvas, 'image/png');
        if (!blob) return { success: false, format: 'clipboard', error: new Error('Blob creation failed') };

        // Note: ClipboardItem is not supported in all browsers, but works in modern ones
        // We check for ClipboardItem to avoid throwing errors on older devices
        if (typeof ClipboardItem !== 'undefined') {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          return { success: true, format: 'clipboard' };
        }
        return { success: false, format: 'clipboard', error: new Error('ClipboardItem not supported') };
      } catch (err) {
        console.warn('Failed to copy to clipboard:', err);
        return { success: false, format: 'clipboard', error: toError(err) };
      }
    },
    [qrRef, config, validateScannability]
  );

  /**
   * Uses the Web Share API to share the QR code image directly to other apps.
   * Falls back to downloading if sharing is not supported.
   * @param options - Optional export options (e.g. allowUnsafe to bypass scannability pre-flight checks).
   */
  const handleShare = useCallback(
    async (options?: ExportOptions): Promise<ExportStatus> => {
      let canvas: HTMLCanvasElement | OffscreenCanvas | null = null;
      if (options?.exportSize) {
        canvas = await renderOffscreenCanvas(config, options.exportSize);
      }
      if (!canvas) {
        canvas = qrRef.current?.querySelector('canvas') || null;
      }

      if (!canvas) return { success: false, format: 'share', error: new Error('Canvas not found') };

      if (!options?.allowUnsafe && !validateScannability(canvas)) {
        return { success: false, format: 'share', error: new Error('SCAN_VALIDATION_FAILED') };
      }

      try {
        const blob = await getCanvasBlob(canvas, 'image/png');
        if (!blob) {
          return { success: false, format: 'share', error: new Error('Blob creation failed') };
        }

        const file = new File([blob], 'qrcode.png', { type: 'image/png' });

        if (canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: 'QRCraftly Code',
              text: 'Here is a QR code I created with QRCraftly!',
              files: [file],
            });
            return { success: true, format: 'share' };
          } catch (error) {
            console.log('Error sharing:', error);
            return { success: false, format: 'share', error: toError(error) };
          }
        } else {
          // Fallback for devices that don't support sharing files
          const fallbackRes = await downloadToDevice('png', options);
          return { ...fallbackRes, format: 'share', fallbackTriggered: true };
        }
      } catch (err) {
        return { success: false, format: 'share', error: toError(err) };
      }
    },
    [qrRef, config, downloadToDevice, canShare, validateScannability]
  );

  /**
   * Generates a vector SVG file from the current QR configuration and triggers
   * a download. The SVG embeds logos as inline base64 data-URLs for portability.
   * Before saving, the generated SVG XML is rendered to an offscreen canvas and
   * verified for scannability.
   * @param options - Optional export options (e.g. allowUnsafe to bypass scannability pre-flight checks).
   */
  const handleSaveSvg = useCallback(
    async (options?: ExportOptions): Promise<ExportStatus> => {
      try {
        let logoOmitted = false;
        const svgString = await generateQRSvg(config, {
          onLogoOmitted: () => {
            logoOmitted = true;
          },
        });

        if (!options?.allowUnsafe) {
          const isScannable = await validateSvgScannability(svgString, config, options);
          if (!isScannable) {
            return { success: false, format: 'svg', error: new Error('SCAN_VALIDATION_FAILED') };
          }
        }

        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = getFilename('svg');
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return { success: true, format: 'svg', logoOmitted };
      } catch (err) {
        console.warn('SVG export failed:', err);
        return { success: false, format: 'svg', error: toError(err) };
      }
    },
    [config, getFilename]
  );

  /**
   * Unified QR export engine seam that coordinates all asset exports.
   * Evaluates scannability bypass policies, formats files, handles fallbacks,
   * and dispatches downloads/shares behind a single interface.
   * @param format - The target export format or sharing mechanism.
   * @param options - Optional export options (e.g. allowUnsafe to bypass scannability pre-flight checks).
   */
  const exportAsset = useCallback(
    async (
      format: 'png' | 'jpeg' | 'webp' | 'svg' | 'clipboard' | 'share',
      options?: ExportOptions
    ): Promise<ExportStatus> => {
      switch (format) {
        case 'png':
        case 'jpeg':
        case 'webp':
          return options?.directDownload
            ? downloadToDevice(format, options)
            : handleSaveAs(format, options);
        case 'svg':
          return handleSaveSvg(options);
        case 'clipboard':
          return handleCopy(options);
        case 'share':
          return handleShare(options);
        default:
          return { success: false, format, error: new Error(`Unsupported export format: ${format}`) };
      }
    },
    [downloadToDevice, handleSaveAs, handleSaveSvg, handleCopy, handleShare]
  );

  return { exportAsset, downloadToDevice, handleSaveAs, handleSaveSvg, handleShare, handleCopy };
}
