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
import { QRConfig, SocialFormat, TemplateStyle } from '../types';
import { drawQR, drawQRInternal } from '../utils/qrRenderer';
import { drawWithTemplate, SOCIAL_DIMENSIONS } from '../utils/templateRenderer';
import { useImage } from '../utils/hooks';
import { ValidationEngine } from '../engine/ValidationEngine';
import { Alert } from './ui/Alert';

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
  onRendered?: (info: { /**
                         *
                         */
  moduleCount: number; /**
                        *
                        */
  virtualImageData?: ImageData }) => void;
}

/**
 * A component that renders a QR code to a canvas element.
 * It supports customization of colors, styles (squares, dots, rounded, etc.),
 * and embedded logos with various padding options.
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

  const typeLabel = config.type.charAt(0).toUpperCase() + config.type.slice(1).toLowerCase();
  const ariaLabel = `QR Code for ${typeLabel} - ${config.value ? 'Scan to view content' : 'Empty'}`;

  const aspectRatioClass = {
    [SocialFormat.SQUARE_1_1]: 'aspect-square',
    [SocialFormat.PORTRAIT_4_5]: 'aspect-[4/5]',
    [SocialFormat.STORY_9_16]: 'aspect-[9/16]',
  }[config.socialFormat];

  const containerClasses = className ? `${className} ${aspectRatioClass}` : aspectRatioClass;

  const violations = ValidationEngine.validateConfig(config);
  const hasViolations = violations.length > 0;

  if (hasViolations) {
    return (
      <div className={`relative ${containerClasses} w-full`}>
        <div className="absolute inset-0">
          <Alert
            variant="error"
            title="Generation Blocked"
            role="status"
            aria-live="polite"
            className="flex flex-col items-center justify-center bg-rose-50 dark:bg-rose-950/25 border-2 border-dashed border-rose-300 dark:border-rose-800 rounded-3xl p-6 text-center gap-3 w-full h-full overflow-y-auto"
          >
            <div className="space-y-1.5 mt-2">
              {violations.map((v, i) => {
                let msg = v;
                if (v === 'URI_INJECTION_VIOLATION') {
                  msg = 'Unsafe URL scheme or malicious protocol detected.';
                } else if (v === 'URL_STRUCTURE_VIOLATION') {
                  msg = 'Malformed URL structure.';
                } else if (v === 'EMAIL_STRUCTURE_VIOLATION') {
                  msg = 'Invalid email address structure.';
                } else if (v === 'LATITUDE_OUT_OF_BOUNDS_VIOLATION') {
                  msg = 'Latitude must remain between -90 and 90 degrees.';
                } else if (v === 'LONGITUDE_OUT_OF_BOUNDS_VIOLATION') {
                  msg = 'Longitude must remain between -180 and 180 degrees.';
                }
                return (
                  <p key={i} className="text-sm text-rose-700 dark:text-rose-400 font-medium">
                    {msg}
                  </p>
                );
              })}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mt-2">
              Please correct the input above to safely resume QR code generation.
            </p>
          </Alert>
        </div>
        <canvas
          ref={handleRef}
          style={{ display: 'none' }}
          role="img"
          aria-label={ariaLabel}
        />
      </div>
    );
  }

  return (
    <div className={`relative ${containerClasses} w-full`}>
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
