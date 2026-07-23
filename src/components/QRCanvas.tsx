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

import React, { useEffect, useRef, useState } from 'react';
import { QRConfig, SocialFormat, TemplateStyle, QRType, CryptoNetwork, SocialPlatform } from '../types';
import { drawQR, drawQRInternal } from '../utils/qrRenderer';
import { drawWithTemplate, SOCIAL_DIMENSIONS } from '../utils/templateRenderer';
import { useImage } from '../utils/hooks';
import { QR_GENERATORS } from '../utils/qrHelpers';
import { parseMeetingUrl } from '../utils/meetingParsers';

/**
 * Props for the QRCanvas component.
 */
interface QRCanvasProps {
  /** The configuration object determining the QR code's appearance and data. */
  config: QRConfig;
  /** The resolution size of the canvas in pixels. Defaults to 1024. */
  size?: number;
  /** Optional CSS class names to apply to the canvas element. */
  className?: string;
  /** Optional callback fired when rendering is complete. */
  onRendered?: (info: { moduleCount: number; virtualImageData?: ImageData }) => void;
}

/**
 * Generates a friendly, conversational dynamic summary for screen readers.
 * Keeps output under 120 characters total (including "QR Code for " prefix).
 */
const getDynamicSummary = (type: QRType, value: string): string => {
  try {
    // eslint-disable-next-line security/detect-object-injection
    const generator = QR_GENERATORS[type];
    if (!generator) {
      const typeLabel = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
      return `${typeLabel} - Scan to view content`;
    }
    const data = generator.hydrate(value);
    switch (type) {
      case QRType.WIFI: {
        const encryptionName = data.encryption === 'nopass' ? 'no' : data.encryption;
        return `WiFi network '${data.ssid || ''}' with ${encryptionName} security`;
      }
      case QRType.MEETING: {
        const parsed = parseMeetingUrl(data.url || '');
        if (parsed.service === 'meet') {
          return `Google Meet conference, ID ${parsed.meetingId || ''}`;
        }
        if (parsed.service === 'zoom') {
          return `Zoom conference, ID ${parsed.meetingId || ''}`;
        }
        if (parsed.service === 'teams') {
          return `Microsoft Teams conference, ID ${parsed.meetingId || ''}`;
        }
        return `meeting link: ${data.url || ''}`;
      }
      case QRType.EMAIL: {
        let emailSummary = `email to ${data.email || ''}`;
        if (data.subject) {
          emailSummary += ` with subject '${data.subject}'`;
        }
        return emailSummary;
      }
      case QRType.PHONE: {
        return `phone call to ${data.number || ''}`;
      }
      case QRType.SMS: {
        let smsSummary = `SMS message to ${data.number || ''}`;
        if (data.message) {
          smsSummary += ` with message '${data.message}'`;
        }
        return smsSummary;
      }
      case QRType.SOCIAL: {
        const platformNames: Record<SocialPlatform, string> = {
          [SocialPlatform.INSTAGRAM]: 'Instagram',
          [SocialPlatform.TWITTER]: 'Twitter/X',
          [SocialPlatform.TIKTOK]: 'TikTok',
        };
        const platformName = platformNames[data.platform as SocialPlatform] || 'Social';
        return `${platformName} profile for ${data.handle || ''}`;
      }
      case QRType.VCARD: {
        const contactName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
        let vcardSummary = contactName ? `contact card for ${contactName}` : `contact card`;
        if (data.organization) {
          vcardSummary += ` from ${data.organization}`;
        }
        return vcardSummary;
      }
      case QRType.PAYMENT: {
        const networkName = data.network === CryptoNetwork.CUSTOM 
          ? 'custom' 
          : (data.network as string).charAt(0).toUpperCase() + (data.network as string).slice(1).toLowerCase();
        let paymentSummary = `${networkName} payment`;
        if (data.amount) {
          paymentSummary += ` of ${data.amount}`;
        }
        if (data.label) {
          paymentSummary += ` for ${data.label}`;
        }
        return paymentSummary;
      }
      case QRType.LOCATION: {
        return `location at latitude ${data.latitude || ''}, longitude ${data.longitude || ''}`;
      }
      case QRType.EVENT: {
        let eventSummary = `event`;
        if (data.title) {
          eventSummary += ` '${data.title}'`;
        }
        if (data.location) {
          eventSummary += ` at ${data.location}`;
        }
        return eventSummary;
      }
      case QRType.URL: {
        return `website link to ${data.url || ''}`;
      }
      case QRType.TEXT: {
        return `text content '${data.text || ''}'`;
      }
      default: {
        const typeStr = type as string;
        const typeLabel = typeStr.charAt(0).toUpperCase() + typeStr.slice(1).toLowerCase();
        return `${typeLabel} - Scan to view content`;
      }
    }
  } catch (err) {
    console.error("Failed to generate dynamic summary:", err);
    const typeStr = type as string;
    const typeLabel = typeStr.charAt(0).toUpperCase() + typeStr.slice(1).toLowerCase();
    return `${typeLabel} - Scan to view content`;
  }
};

/**
 * A component that renders a QR code to a canvas element.
 * It supports customization of colors, styles (squares, dots, rounded, etc.),
 * and embedded logos with various padding options.
 *
 * @param props - The component props.
 * @param props.config - The configuration object.
 * @param props.size - The canvas resolution size (default: 1024).
 * @param props.className - Optional CSS classes.
 * @param props.onRendered - Callback when render finishes.
 * @returns The QRCanvas component.
 */
const QRCanvas = React.forwardRef<HTMLCanvasElement, QRCanvasProps>(({ config, size = 1024, className, onRendered }, ref) => {
  const localCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Use either the forwarded ref or the local one
  const handleRef = (node: HTMLCanvasElement | null) => {
    localCanvasRef.current = node;
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  };

  // Pre-load images to avoid async rendering and flickering
  const logoImg = useImage(config.logoUrl);
  const borderLogoImg = useImage(config.isBorderEnabled ? config.borderLogoUrl : null);

  const [qrData, setQrData] = useState<any>(null);

  // Dynamically load QRCode and generate data
  useEffect(() => {
    if (!config.value) {
      setQrData(null);
      return;
    }

    let isMounted = true;
    import('qrcode').then((QRCode) => {
      if (!isMounted) return;
      try {
        const data = QRCode.create(config.value, { errorCorrectionLevel: config.errorCorrectionLevel });
        setQrData(data);
      } catch (e) {
        console.warn("QR generation failed:", e);
        setQrData(null);
      }
    });

    return () => { isMounted = false; };
  }, [config.value, config.errorCorrectionLevel]);

  useEffect(() => {
    const canvas = localCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pixelRatio = window.devicePixelRatio || 1;
    const useTemplate =
      config.templateStyle !== TemplateStyle.NONE ||
      config.socialFormat !== SocialFormat.SQUARE_1_1;

    if (!qrData) {
      // Clear if no data
      if (useTemplate) {
        const { width: fw, height: fh } = SOCIAL_DIMENSIONS[config.socialFormat];
        const displayHeight = Math.round(size * fh / fw);
        canvas.width = size * pixelRatio;
        canvas.height = displayHeight * pixelRatio;
      } else {
        canvas.width = size * pixelRatio;
        canvas.height = size * pixelRatio;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    if (useTemplate) {
      // ── Template / social format rendering ─────────────────────────────────
      const { width: fw, height: fh } = SOCIAL_DIMENSIONS[config.socialFormat];
      const displayWidth = size;
      const displayHeight = Math.round(size * fh / fw);

      canvas.width = displayWidth * pixelRatio;
      canvas.height = displayHeight * pixelRatio;

      ctx.save();
      ctx.scale(pixelRatio, pixelRatio);

      drawWithTemplate(
        ctx as unknown as CanvasRenderingContext2D,
        qrData.modules,
        config,
        logoImg,
        borderLogoImg,
        displayWidth,
        displayHeight,
        qrData.modules.size
      );

      ctx.restore();
    } else {
      // ── Original square rendering path (no change in behaviour) ────────────
      drawQR(ctx, qrData.modules, config, logoImg, borderLogoImg, size);
    }

    if (onRendered) {
      onRendered({ moduleCount: qrData.modules.size });

      // Perform virtual offscreen rendering for deterministic validation
      const runVirtualRender = () => {
        try {
          const virtualSize = 1024;
          let vCanvas: HTMLCanvasElement | OffscreenCanvas;
          
          if (typeof OffscreenCanvas !== 'undefined') {
            vCanvas = new OffscreenCanvas(virtualSize, virtualSize);
          } else {
            vCanvas = document.createElement('canvas');
            vCanvas.width = virtualSize;
            vCanvas.height = virtualSize;
          }
          
          const vCtx = vCanvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
          if (!vCtx) return;

          let displayWidth = virtualSize;
          let displayHeight = virtualSize;

          if (useTemplate) {
            const { width: fw, height: fh } = SOCIAL_DIMENSIONS[config.socialFormat];
            displayHeight = Math.round(virtualSize * fh / fw);
            if (typeof OffscreenCanvas !== 'undefined') {
              vCanvas.height = displayHeight;
            } else {
              (vCanvas as HTMLCanvasElement).height = displayHeight;
            }

            drawWithTemplate(
              vCtx as unknown as CanvasRenderingContext2D,
              qrData.modules,
              config,
              logoImg,
              borderLogoImg,
              displayWidth,
              displayHeight,
              qrData.modules.size,
              true
            );
          } else {
            vCtx.clearRect(0, 0, displayWidth, displayHeight);
            drawQRInternal(
              vCtx as unknown as CanvasRenderingContext2D,
              qrData.modules,
              config,
              logoImg,
              borderLogoImg,
              virtualSize,
              qrData.modules.size,
              true
            );
          }
          
          const imageData = vCtx.getImageData(0, 0, displayWidth, displayHeight);
          onRendered({ moduleCount: qrData.modules.size, virtualImageData: imageData });
          
          // Free memory
          if (vCanvas) {
            vCanvas.width = 0;
            vCanvas.height = 0;
          }
        } catch (err) {
          console.error("Virtual rendering failed:", err);
        }
      };

      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(runVirtualRender);
      } else {
        setTimeout(runVirtualRender, 50);
      }
    }

  }, [config, size, qrData, logoImg, borderLogoImg, onRendered]);

  let ariaLabel = '';
  if (!config.value) {
    const typeLabel = config.type.charAt(0).toUpperCase() + config.type.slice(1).toLowerCase();
    ariaLabel = `QR Code for ${typeLabel} - Empty`;
  } else {
    const dynamicSummary = getDynamicSummary(config.type, config.value);
    const fullLabel = `QR Code for ${dynamicSummary}`;
    ariaLabel = fullLabel.length <= 120 ? fullLabel : fullLabel.substring(0, 117) + '...';
  }

  const aspectRatioClass = {
    [SocialFormat.SQUARE_1_1]: 'aspect-square',
    [SocialFormat.PORTRAIT_4_5]: 'aspect-[4/5]',
    [SocialFormat.STORY_9_16]: 'aspect-[9/16]',
  }[config.socialFormat];

  const containerClasses = className ? `${className} ${aspectRatioClass}` : aspectRatioClass;

  return (
    <div className={containerClasses}>
      <canvas
        ref={handleRef}
        className={`w-full h-auto block ${aspectRatioClass}`}
        role="img"
        aria-label={ariaLabel}
      />
    </div>
  );
});

export default React.memo(QRCanvas);
