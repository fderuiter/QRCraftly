import { RefObject } from 'react';
import { QRConfig } from '../types';

/**
 * Hook to handle QR code download and sharing functionality.
 *
 * @param qrRef - Reference to the QR code container element.
 * @param config - The current QR code configuration.
 * @returns Object containing download and share functions.
 */
export const useQRDownload = (qrRef: RefObject<HTMLDivElement | null>, config: QRConfig) => {
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
  const getFilename = (ext: string) => {
    const type = config.type.toLowerCase();
    const date = new Date().toISOString().split('T')[0];
    return `${type}-qr-code-qrcraftly-${date}.${ext}`;
  };

  /**
   * Downloads the current QR code canvas content to the user's device.
   * Used as a fallback or direct action for saving to photos.
   * @param format - The desired image format.
   */
  const downloadToDevice = (format: 'png' | 'jpeg' | 'webp') => {
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
  };

  /**
   * Handles saving the QR code image, attempting to use the File System Access API
   * for a native "Save As" experience, falling back to direct download if unsupported.
   * @param format - The desired image format.
   */
  const handleSaveAs = async (format: 'png' | 'jpeg' | 'webp') => {
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
  };

  /**
   * Uses the Web Share API to share the QR code image directly to other apps.
   * Falls back to downloading if sharing is not supported.
   */
  const handleShare = async () => {
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
          alert("Sharing is not supported on this device/browser. The image will be downloaded instead.");
          downloadToDevice('png');
        }
      }, 'image/png');
    }
  };

  return { downloadToDevice, handleSaveAs, handleShare };
};
