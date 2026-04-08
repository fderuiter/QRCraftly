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
import { drawQR } from '../utils/qrRenderer';
import { drawWithTemplate, getAspectRatioCss, SOCIAL_DIMENSIONS } from '../utils/templateRenderer';
import { useImage } from '../utils/hooks';

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
}

/**
 * A component that renders a QR code to a canvas element.
 * It supports customization of colors, styles (squares, dots, rounded, etc.),
 * and embedded logos with various padding options.
 *
 * @param props - The component props.
 * @param props.config - The configuration object.
 * @param props.size - The canvas resolution size (default: 1024).
 * @param props.className - Optional CSS classes.
 * @returns The QRCanvas component.
 */
const QRCanvas: React.FC<QRCanvasProps> = ({ config, size = 1024, className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    const canvas = canvasRef.current;
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

  }, [config, size, qrData, logoImg, borderLogoImg]);

  const typeLabel = config.type.charAt(0).toUpperCase() + config.type.slice(1).toLowerCase();
  const ariaLabel = `QR Code for ${typeLabel} - ${config.value ? 'Scan to view content' : 'Empty'}`;

  const aspectRatioCss = getAspectRatioCss(config.socialFormat);

  return (
    <div className={className} style={{ aspectRatio: aspectRatioCss }}>
      <canvas
        ref={canvasRef}
        className="w-full h-auto block"
        style={{ aspectRatio: aspectRatioCss }}
        role="img"
        aria-label={ariaLabel}
      />
    </div>
  );
};

export default React.memo(QRCanvas);
