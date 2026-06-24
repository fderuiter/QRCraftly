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
import { QRConfig, SocialFormat, TemplateStyle } from '../types';
import { generateQRSvg } from './svgExport';
import { useToast } from '../components/ui/Toast';
import { useCapabilities } from '../hooks/useCapabilities';
import { drawQRInternal } from './qrRenderer';
import { drawWithTemplate, SOCIAL_DIMENSIONS } from './templateRenderer';

const loadImage = (url: string | null): Promise<HTMLImageElement | null> => {
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn('Failed to load image:', url);
      resolve(null);
    };
    img.src = url;
  });
};

const generateVirtualCanvas = async (config: QRConfig, size = 1024): Promise<HTMLCanvasElement> => {
  const QRCode = await import('qrcode');
  const qrData = QRCode.create(config.value, { errorCorrectionLevel: config.errorCorrectionLevel });
  
  const logoImg = await loadImage(config.logoUrl);
  const borderLogoImg = config.isBorderEnabled ? await loadImage(config.borderLogoUrl) : null;
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Failed to get 2d context');

  const useTemplate =
    config.templateStyle !== TemplateStyle.NONE ||
    config.socialFormat !== SocialFormat.SQUARE_1_1;

  if (useTemplate) {
    const { width: fw, height: fh } = SOCIAL_DIMENSIONS[config.socialFormat];
    const displayHeight = Math.round(size * fh / fw);
    canvas.width = size;
    canvas.height = displayHeight;

    drawWithTemplate(
      ctx as unknown as CanvasRenderingContext2D,
      qrData.modules as any,
      config,
      logoImg,
      borderLogoImg,
      size,
      displayHeight,
      qrData.modules.size,
      true // isVirtual
    );
  } else {
    canvas.width = size;
    canvas.height = size;
    ctx.clearRect(0, 0, size, size);

    drawQRInternal(
      ctx as unknown as CanvasRenderingContext2D,
      qrData.modules as any,
      config,
      logoImg,
      borderLogoImg,
      size,
      qrData.modules.size,
      true // isVirtual
    );
  }

  return canvas;
};

/**
 * Return type for the useQRDownload hook.
 */
interface UseQRDownloadReturn {
  downloadToDevice: (format: 'png' | 'jpeg' | 'webp') => Promise<void>;
  handleSaveAs: (format: 'png' | 'jpeg' | 'webp') => Promise<void>;
  handleSaveSvg: () => Promise<void>;
  handleShare: () => Promise<void>;
  handleCopy: () => Promise<boolean>;
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
  _qrRef: RefObject<HTMLDivElement | null>,
  config: QRConfig
): UseQRDownloadReturn {
  const { addToast } = useToast();
  const { canSaveFilePicker, canShare } = useCapabilities();

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
  const downloadToDevice = useCallback(async (format: 'png' | 'jpeg' | 'webp') => {
    try {
      const canvas = await generateVirtualCanvas(config);
      const url = canvas.toDataURL(`image/${format}`);
      const link = document.createElement('a');
      const ext = getExtension(format);
      link.download = getFilename(ext);
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.warn('Failed to generate virtual canvas for download:', err);
    }
  }, [config, getFilename]);

  /**
   * Handles saving the QR code image, attempting to use the File System Access API
   * for a native "Save As" experience, falling back to direct download if unsupported.
   * @param format - The desired image format.
   */
  const handleSaveAs = useCallback(async (format: 'png' | 'jpeg' | 'webp') => {
    try {
      const canvas = await generateVirtualCanvas(config);

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
        } catch (err: any) {
          // If user aborted the picker, do nothing.
          if (err.name === 'AbortError') return;

          console.warn('File System Access API failed, falling back to standard download:', err);
          await downloadToDevice(format);
        }
      } else {
        // Fallback for browsers that don't support showSaveFilePicker (Safari, Firefox, Mobile)
        await downloadToDevice(format);
      }
    } catch (err) {
      console.warn('Failed to save QR code:', err);
    }
  }, [config, getFilename, downloadToDevice, canSaveFilePicker]);

  /**
   * Uses the Web Share API to share the QR code image directly to other apps.
   * Falls back to downloading if sharing is not supported.
   */
  /**
   * Copies the QR code image directly to the clipboard.
   * @returns A boolean indicating if the copy operation was successful.
   */
  const handleCopy = useCallback(async (): Promise<boolean> => {
    try {
      const canvas = await generateVirtualCanvas(config);
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
  }, [config]);

  const handleShare = useCallback(async () => {
    try {
      const canvas = await generateVirtualCanvas(config);
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const file = new File([blob], 'qrcode.png', { type: 'image/png' });

        if (canShare && navigator.canShare({ files: [file] })) {
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
          addToast({
            type: 'info',
            message: "Sharing is not supported on this device/browser. The image will be downloaded instead.",
            duration: 5000
          });
          await downloadToDevice('png');
        }
      }, 'image/png');
    } catch (err) {
      console.warn('Failed to generate virtual canvas for sharing:', err);
    }
  }, [config, downloadToDevice, canShare, addToast]);

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
    } catch (err: any) {
      console.warn('SVG export failed:', err);
      addToast({
        type: 'error',
        message: err.message || 'SVG export failed due to an unsupported feature or error.',
        duration: 5000
      });
      throw err;
    }
  }, [config, getFilename, addToast]);

  return { downloadToDevice, handleSaveAs, handleSaveSvg, handleShare, handleCopy };
}

