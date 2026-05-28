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

import React, { RefObject, useCallback, useState } from 'react';
import { QRConfig } from '../types';
import { generateQRSvg } from './svgExport';

/**
 * Return type for the useQRDownload hook.
 */
interface UseQRDownloadReturn {
  downloadToDevice: (format: 'png' | 'jpeg' | 'webp') => void;
  handleSaveAs: (format: 'png' | 'jpeg' | 'webp') => Promise<void>;
  handleSaveSvg: () => Promise<void>;
  handleShare: () => Promise<void>;
  handleCopy: () => Promise<boolean>;
  shareFallbackMessage: string | null;
  clearShareFallback: () => void;
}

/**
 * Hook to handle downloading, sharing, and copying of the QR code.
 * Extracts this logic from the main component to reduce cognitive load.
 *
 * @param qrRef Reference to the container element containing the canvas.
 * @param config Current QR configuration (used for filename generation).
 * @returns Object containing download and share handlers.
 */
export function useQRDownload(
  qrRef: RefObject<HTMLDivElement | null>,
  config: QRConfig
): UseQRDownloadReturn {
  const [shareFallbackMessage, setShareFallbackMessage] = React.useState<string | null>(null);

  const clearShareFallback = useCallback(() => setShareFallbackMessage(null), []);

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
  const downloadToDevice = useCallback((format: 'png' | 'jpeg' | 'webp') => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (canvas) {
      const url = canvas.toDataURL(`image/${format}`);
      const link = document.createElement('a');
      const ext = getExtension(format);
      link.download = getFilename(ext);
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [qrRef, getFilename]);

  /**
   * Handles saving the QR code image, attempting to use the File System Access API
   * for a native "Save As" experience, falling back to direct download if unsupported.
   * @param format - The desired image format.
   */
  const handleSaveAs = useCallback(async (format: 'png' | 'jpeg' | 'webp') => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;

    // Check if the browser supports the File System Access API (e.g., Chrome, Edge Desktop)
    if ('showSaveFilePicker' in window) {
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
      } catch (err: any) {
        // If user aborted the picker, do nothing.
        if (err.name === 'AbortError') return;

        console.warn('File System Access API failed, falling back to standard download:', err);
        downloadToDevice(format);
      }
    } else {
      // Fallback for browsers that don't support showSaveFilePicker (Safari, Firefox, Mobile)
      downloadToDevice(format);
    }
  }, [qrRef, getFilename, downloadToDevice]);

  /**
   * Uses the Web Share API to share the QR code image directly to other apps.
   * Falls back to downloading if sharing is not supported.
   */
  /**
   * Copies the QR code image directly to the clipboard.
   * @returns A boolean indicating if the copy operation was successful.
   */
  const handleCopy = useCallback(async (): Promise<boolean> => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return false;

    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) return false;

      // Note: ClipboardItem is not supported in all browsers, but works in modern ones
      // We check for ClipboardItem to avoid throwing errors on older devices
      if (typeof ClipboardItem !== 'undefined') {
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Failed to copy to clipboard:', err);
      return false;
    }
  }, [qrRef]);

  const handleShare = useCallback(async () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (canvas) {
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const file = new File([blob], 'qrcode.png', { type: 'image/png' });

        if (navigator.share && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: 'QRCraftly Code',
              text: 'Here is a QR code I created with QRCraftly!',
              files: [file],
            });
          } catch (error) {
            console.log('Error sharing:', error);
          }
        } else {
          // Fallback for devices that don't support sharing files
          setShareFallbackMessage("Sharing is not supported on this device/browser. The image will be downloaded instead.");
          downloadToDevice('png');
        }
      }, 'image/png');
    }
  }, [qrRef, downloadToDevice]);

  /**
   * Generates a vector SVG file from the current QR configuration and triggers
   * a download. The SVG embeds logos as inline base64 data-URLs for portability.
   */
  const handleSaveSvg = useCallback(async () => {
    try {
      const svgString = await generateQRSvg(config);
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = getFilename('svg');
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.warn('SVG export failed:', err);
    }
  }, [config, getFilename]);

  return { downloadToDevice, handleSaveAs, handleSaveSvg, handleShare, handleCopy, shareFallbackMessage, clearShareFallback };
}
