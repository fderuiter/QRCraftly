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
import { QRConfig } from '../types';
import { generateQRSvg } from '../utils/svgExport';
import { useCapabilities } from './useCapabilities';
import { exportSafetyService } from '../services/ExportSafetyService';

/**
 * Return type for the useQRDownload hook.
 */
export interface ExportStatus {
  /** Indicates whether the export operation succeeded. */
  success: boolean;
  /** Format of the exported asset. */
  format?: 'png' | 'jpeg' | 'webp' | 'svg' | 'clipboard' | 'share';
  /** Error object if export failed. */
  error?: any;
  /** Indicates whether a fallback export mechanism was triggered. */
  fallbackTriggered?: boolean;
  /** Indicates whether remote logo was omitted during vector export. */
  logoOmitted?: boolean;
}

/**
 * Return type for the useQRDownload hook.
 */
interface UseQRDownloadReturn {
  /** Downloads the canvas image to local device storage. */
  downloadToDevice: (format: 'png' | 'jpeg' | 'webp') => Promise<ExportStatus>;
  /** Opens native Save-As file picker if supported, with direct download fallback. */
  handleSaveAs: (format: 'png' | 'jpeg' | 'webp') => Promise<ExportStatus>;
  /** Generates and downloads vector SVG QR code. */
  handleSaveSvg: () => Promise<ExportStatus>;
  /** Shares QR code image via Web Share API. */
  handleShare: () => Promise<ExportStatus>;
  /** Copies QR code image to system clipboard. */
  handleCopy: () => Promise<ExportStatus>;
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
  const validateScannability = useCallback((canvas: HTMLCanvasElement): boolean => {
    return exportSafetyService.validateCanvasScannability(canvas, config);
  }, [config]);

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
  const getFilename = useCallback((ext: string) => {
    const type = config.type.toLowerCase();
    const date = new Date().toISOString().split('T')[0];
    return `${type}-qr-code-qrcraftly-${date}.${ext}`;
  }, [config.type]);

  /**
   * Downloads the current QR code canvas content to the user's device.
   * Used as a fallback or direct action for saving to photos.
   * @param format - The desired image format.
   */
  const downloadToDevice = useCallback(async (format: 'png' | 'jpeg' | 'webp'): Promise<ExportStatus> => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (canvas) {
      if (!validateScannability(canvas)) {
        return { success: false, format, error: new Error('SCAN_VALIDATION_FAILED') };
      }
      try {
        const url = canvas.toDataURL(`image/${format}`);
        const link = document.createElement('a');
        const ext = getExtension(format);
        link.download = getFilename(ext);
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return { success: true, format };
      } catch (err: any) {
        return { success: false, format, error: err };
      }
    }
    return { success: false, format, error: new Error('Canvas not found') };
  }, [qrRef, getFilename, validateScannability]);

  /**
   * Handles saving the QR code image, attempting to use the File System Access API
   * for a native "Save As" experience, falling back to direct download if unsupported.
   * @param format - The desired image format.
   */
  const handleSaveAs = useCallback(async (format: 'png' | 'jpeg' | 'webp'): Promise<ExportStatus> => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return { success: false, format, error: new Error('Canvas not found') };

    if (!validateScannability(canvas)) {
      return { success: false, format, error: new Error('SCAN_VALIDATION_FAILED') };
    }

    // Check if the browser supports the File System Access API (e.g., Chrome, Edge Desktop)
    if (canSaveFilePicker) {
      try {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, `image/${format}`)
        );

        if (!blob) throw new Error('Failed to create image blob');

        const ext = getExtension(format);

        const handle = await (window as any).showSaveFilePicker({
          suggestedName: getFilename(ext),
          types: [{
            description: 'QR Code Image',
            accept: { [`image/${format}`]: [`.${ext}`] },
          }],
        });

        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return { success: true, format };
      } catch (err: any) {
        // If user aborted the picker, return failure but identify abort.
        if (err.name === 'AbortError') {
          return { success: false, format, error: err };
        }

        console.warn('File System Access API failed, falling back to standard download:', err);
        return downloadToDevice(format);
      }
    } else {
      // Fallback for browsers that don't support showSaveFilePicker (Safari, Firefox, Mobile)
      return downloadToDevice(format);
    }
  }, [qrRef, getFilename, downloadToDevice, canSaveFilePicker, validateScannability]);

  /**
   * Copies the QR code image directly to the clipboard.
   * @returns A boolean indicating if the copy operation was successful.
   */
  const handleCopy = useCallback(async (): Promise<ExportStatus> => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return { success: false, format: 'clipboard', error: new Error('Canvas not found') };

    if (!validateScannability(canvas)) {
      return { success: false, format: 'clipboard', error: new Error('SCAN_VALIDATION_FAILED') };
    }

    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
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
      return { success: false, format: 'clipboard', error: err };
    }
  }, [qrRef, validateScannability]);

  /**
   * Uses the Web Share API to share the QR code image directly to other apps.
   * Falls back to downloading if sharing is not supported.
   */
  const handleShare = useCallback(async (): Promise<ExportStatus> => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return { success: false, format: 'share', error: new Error('Canvas not found') };

    if (!validateScannability(canvas)) {
      return { success: false, format: 'share', error: new Error('SCAN_VALIDATION_FAILED') };
    }

    return new Promise<ExportStatus>((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          resolve({ success: false, format: 'share', error: new Error('Blob creation failed') });
          return;
        }

        const file = new File([blob], 'qrcode.png', { type: 'image/png' });

        if (canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: 'QRCraftly Code',
              text: 'Here is a QR code I created with QRCraftly!',
              files: [file],
            });
            resolve({ success: true, format: 'share' });
          } catch (error) {
            console.log('Error sharing:', error);
            resolve({ success: false, format: 'share', error });
          }
        } else {
          // Fallback for devices that don't support sharing files
          await downloadToDevice('png');
          resolve({ success: true, format: 'share', fallbackTriggered: true });
        }
      }, 'image/png');
    });
  }, [qrRef, downloadToDevice, canShare, validateScannability]);

  /**
   * Generates a vector SVG file from the current QR configuration and triggers
   * a download. The SVG embeds logos as inline base64 data-URLs for portability.
   * Before saving, the generated SVG XML is rendered to an offscreen canvas and
   * verified for scannability.
   */
  const handleSaveSvg = useCallback(async (): Promise<ExportStatus> => {
    try {
      let logoOmitted = false;
      const svgString = await generateQRSvg(config, {
        onLogoOmitted: () => {
          logoOmitted = true;
        },
      });

      const evaluation = await exportSafetyService.evaluateExportSafety(config, { svgString, format: 'svg' });
      if (!evaluation.isScannable) {
        return { success: false, format: 'svg', error: new Error('SCAN_VALIDATION_FAILED') };
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
    } catch (err: any) {
      console.warn('SVG export failed:', err);
      return { success: false, format: 'svg', error: err };
    }
  }, [config, getFilename]);

  return { downloadToDevice, handleSaveAs, handleSaveSvg, handleShare, handleCopy };
}
