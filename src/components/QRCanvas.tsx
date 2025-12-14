import React, { useEffect, useRef, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { QRConfig, QRStyle } from '../types';
import { drawRoundRect, drawPoly, drawStar, drawRoughRect, drawScribble } from '../utils/canvasHelpers';

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
 * Hook to load an image asynchronously.
 * Returns the HTMLImageElement once loaded, or null.
 */
const useImage = (url: string | null) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!url) {
      setImage(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = url;

    // If image is already cached and loaded immediately
    if (img.complete && img.naturalHeight !== 0) {
        setImage(img);
        return;
    }

    img.onload = () => setImage(img);
    img.onerror = () => setImage(null);

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [url]);

  return image;
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
 * @returns The QRCanvas component.
 */
const QRCanvas: React.FC<QRCanvasProps> = ({ config, size = 1024, className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Pre-load images to avoid async rendering and flickering
  const logoImg = useImage(config.logoUrl);
  const borderLogoImg = useImage(config.isBorderEnabled ? config.borderLogoUrl : null);

  // Memoize QR data generation to avoid re-computation on style changes
  const qrData = useMemo(() => {
    if (!config.value) return null;
    try {
      return QRCode.create(config.value, { errorCorrectionLevel: config.errorCorrectionLevel });
    } catch (e) {
      console.warn("QR generation failed:", e);
      return null;
    }
  }, [config.value, config.errorCorrectionLevel]);

  useEffect(() => {
    /**
     * Renders the QR code onto the canvas.
     * This function handles module generation, styling, and logo embedding.
     */
    const renderQR = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Setup scaling
      const pixelRatio = window.devicePixelRatio || 1;
      const displaySize = size;
      const rawSize = displaySize * pixelRatio;
      
      // Set the actual resolution of the canvas
      canvas.width = rawSize;
      canvas.height = rawSize;
      
      // Clear canvas initially
      ctx.clearRect(0, 0, rawSize, rawSize);

      // Guard against empty input
      if (!qrData) {
        return;
      }

      try {
        // 1. Generate QR Data (Modules)
        const modules = qrData.modules;
        const moduleCount = modules.size;
        
        ctx.scale(pixelRatio, pixelRatio);
        
        let drawX = 0;
        let drawY = 0;
        let drawSize = displaySize;

        // Draw Border if enabled
        if (config.isBorderEnabled && config.borderSize > 0) {
            const borderPx = displaySize * config.borderSize;

            // Draw Border Background
            ctx.fillStyle = config.borderColor;
            ctx.fillRect(0, 0, displaySize, displaySize);

            // Draw Patterns based on style
            if (config.borderStyle === 'dashed' || config.borderStyle === 'dotted') {
                ctx.strokeStyle = config.bgColor; // Use background color for contrast
                ctx.lineWidth = borderPx * 0.2;
                if (config.borderStyle === 'dashed') {
                    ctx.setLineDash([borderPx * 0.5, borderPx * 0.5]);
                } else {
                    ctx.setLineDash([borderPx * 0.2, borderPx * 0.2]); // Dotted
                }
                ctx.strokeRect(borderPx * 0.5, borderPx * 0.5, displaySize - borderPx, displaySize - borderPx);
                ctx.setLineDash([]); // Reset
            } else if (config.borderStyle === 'double') {
                ctx.strokeStyle = config.bgColor;
                ctx.lineWidth = borderPx * 0.15;
                const offset = borderPx * 0.3;
                ctx.strokeRect(offset, offset, displaySize - offset * 2, displaySize - offset * 2);
            }

            // Adjust area for QR code
            drawX = borderPx;
            drawY = borderPx;
            drawSize = displaySize - (borderPx * 2);

            // Fill background for QR code
            ctx.fillStyle = config.bgColor;
            ctx.fillRect(drawX, drawY, drawSize, drawSize);
        } else {
            // Fill Background
            ctx.fillStyle = config.bgColor;
            ctx.fillRect(0, 0, displaySize, displaySize);
        }

        // Helper to determine if a module is an "eye"
        const isEye = (row: number, col: number): boolean => {
          if (row < 7 && col < 7) return true;
          if (row < 7 && col >= moduleCount - 7) return true;
          if (row >= moduleCount - 7 && col < 7) return true;
          return false;
        };

        const cellSize = drawSize / moduleCount;

        // --- DRAWING HELPERS ---

        // Helper to punch hole with bgColor
        const clearShape = (drawFn: () => void) => {
            ctx.fillStyle = config.bgColor;
            drawFn();
            ctx.fillStyle = config.eyeColor; // Restore
        };

        const drawEyePattern = (r: number, c: number) => {
            const x = drawX + c * cellSize;
            const y = drawY + r * cellSize;
            const size = 7 * cellSize;

            ctx.fillStyle = config.eyeColor;

            const cx = x + size / 2;
            const cy = y + size / 2;

            switch (config.style) {
                case QRStyle.MODERN: // Rounded Squares
                    // Frame (Less rounded for robustness)
                    ctx.beginPath();
                    drawRoundRect(ctx, x, y, size, size, cellSize * 1.5);
                    ctx.fill();
                    // Hole
                    clearShape(() => {
                         ctx.beginPath();
                         drawRoundRect(ctx, x + cellSize, y + cellSize, size - 2*cellSize, size - 2*cellSize, cellSize * 0.8);
                         ctx.fill();
                    });

                    // Eyeball (Solid Square with slight rounding)
                    ctx.beginPath();
                    drawRoundRect(ctx, x + 2*cellSize, y + 2*cellSize, 3*cellSize, 3*cellSize, cellSize * 0.5);
                    ctx.fill();
                    break;

                case QRStyle.SWISS: // Swiss Dot
                    // Frame: Standard Square with Rounded Corners (Like Modern, robust)
                    ctx.beginPath();
                    drawRoundRect(ctx, x, y, size, size, cellSize * 1.5);
                    ctx.fill();
                    // Hole
                    clearShape(() => {
                        ctx.beginPath();
                        // Standard Hole (Radius 2.5, Diameter 5)
                        drawRoundRect(ctx, x + cellSize, y + cellSize, size - 2*cellSize, size - 2*cellSize, cellSize * 0.8);
                        ctx.fill();
                    });

                    // Eyeball: Floating Dot (Circular)
                    ctx.beginPath();
                    // Standard Radius 1.5 (Diameter 3)
                    ctx.arc(cx, cy, 1.5 * cellSize, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case QRStyle.FLUID: // Fluid
                    // COPY OF SWISS (Proven to pass)
                    // Frame: Standard Square with Rounded Corners
                    ctx.beginPath();
                    drawRoundRect(ctx, x, y, size, size, cellSize * 1.5);
                    ctx.fill();

                    clearShape(() => {
                        ctx.beginPath();
                        drawRoundRect(ctx, x + cellSize, y + cellSize, size - 2*cellSize, size - 2*cellSize, cellSize * 0.8);
                        ctx.fill();
                    });

                    // Eyeball: Circular (Same as Swiss)
                    ctx.beginPath();
                    ctx.arc(cx, cy, 1.5 * cellSize, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case QRStyle.CIRCUIT: // Cyber-Circuit (Brackets + Notched)
                     // Frame: Solid box with "simulated" brackets via small white lines
                     ctx.fillRect(x, y, size, size);

                     clearShape(() => {
                         // Standard Hole
                         ctx.fillRect(x + cellSize, y + cellSize, size - 2*cellSize, size - 2*cellSize);
                     });

                     // Simulate brackets by drawing small white lines over the frame
                     ctx.fillStyle = config.bgColor;
                     const gap = cellSize * 0.5;
                     ctx.fillRect(cx - gap/2, y, gap, cellSize * 1.1); // Top cut
                     ctx.fillRect(cx - gap/2, y + size - cellSize*1.1, gap, cellSize*1.1); // Bottom cut
                     ctx.fillRect(x, cy - gap/2, cellSize * 1.1, gap); // Left cut
                     ctx.fillRect(x + size - cellSize*1.1, cy - gap/2, cellSize * 1.1, gap); // Right cut
                     ctx.fillStyle = config.eyeColor;

                     // Eyeball: Notched Square
                     ctx.beginPath();
                     // Standard 3x3 square
                     ctx.rect(x + 2*cellSize, y + 2*cellSize, 3*cellSize, 3*cellSize);
                     ctx.fill();
                     // Add slight notch via clearing
                     clearShape(() => {
                        ctx.fillRect(x + 4.6*cellSize, y + 4.6*cellSize, 0.4*cellSize, 0.4*cellSize);
                     });
                     break;

                case QRStyle.HIVE: // Hexagon
                    // Frame: Standard Square
                    ctx.fillRect(x, y, size, size);

                    clearShape(() => {
                        // Standard Hole
                        ctx.fillRect(x + cellSize, y + cellSize, size - 2*cellSize, size - 2*cellSize);
                    });

                    // Eyeball: Solid Hex (This is fine usually if large enough)
                    drawPoly(ctx, cx, cy, 1.8 * cellSize, 6, 0, true);
                    break;

                case QRStyle.GRUNGE: // Grunge
                    // Frame
                    drawRoughRect(ctx, x, y, size, size);

                    clearShape(() => {
                        ctx.fillRect(x + cellSize, y + cellSize, size - 2*cellSize, size - 2*cellSize);
                    });

                    // Eyeball - Solid rough polygon
                    drawScribble(ctx, x + 2*cellSize, y + 2*cellSize, 3*cellSize);
                    break;

                case QRStyle.STARBURST:
                     // Frame: Standard Square (Spikes on outside kill detection)
                     ctx.fillRect(x, y, size, size);

                     clearShape(() => {
                         // Standard Hole
                         ctx.fillRect(x + cellSize, y + cellSize, size - 2*cellSize, size - 2*cellSize);
                     });

                     // Eyeball: Star
                     // Make it fat
                     drawStar(ctx, cx, cy, 1.9*cellSize, 1.2*cellSize, 5, true);
                     break;

                case QRStyle.STANDARD:
                default:
                    // Standard
                    ctx.fillRect(x, y, size, size);
                    clearShape(() => {
                         ctx.clearRect(x + cellSize, y + cellSize, size - 2*cellSize, size - 2*cellSize);
                         ctx.fillRect(x + cellSize, y + cellSize, size - 2*cellSize, size - 2*cellSize);
                    });
                    ctx.fillRect(x + 2*cellSize, y + 2*cellSize, 3*cellSize, 3*cellSize);
                    break;
            }
        };

        // Determine safe limit for logo size
        const SAFE_AREA_RATIO = (() => {
           switch(config.errorCorrectionLevel) {
               case 'L': return 0.22;
               case 'M': return 0.35;
               case 'Q': return 0.45;
               case 'H': default: return 0.50;
           }
        })();
        
        const requestedLogoSizeModules = config.logoSize * moduleCount;
        const paddingModules = config.logoPaddingStyle === 'none' ? 0 : config.logoPadding;
        const requestedCutoutModules = requestedLogoSizeModules + (paddingModules * 2);

        let effectiveLogoSizeModules = requestedLogoSizeModules;
        let effectivePaddingModules = paddingModules;

        if (requestedCutoutModules > moduleCount * SAFE_AREA_RATIO) {
            const maxCutoutModules = moduleCount * SAFE_AREA_RATIO;
            const scaleFactor = maxCutoutModules / requestedCutoutModules;
            effectiveLogoSizeModules = requestedLogoSizeModules * scaleFactor;
            effectivePaddingModules = paddingModules * scaleFactor;
        }

        const logoSizePx = effectiveLogoSizeModules * cellSize;
        const logoPaddingPx = effectivePaddingModules * cellSize;
        const cutoutModuleSize = effectiveLogoSizeModules + (effectivePaddingModules * 2);
        const center = moduleCount / 2;

        const isCoveredByLogo = (r: number, c: number) => {
          if (!config.logoUrl) return false;
          const x = c - center + 0.5;
          const y = r - center + 0.5;
          if (config.logoPaddingStyle === 'circle') {
            const radius = (cutoutModuleSize / 2); 
            return (x * x + y * y) < (radius * radius);
          } else {
            const halfSize = (cutoutModuleSize / 2);
            return Math.abs(x) < halfSize && Math.abs(y) < halfSize;
          }
        };

        // Draw Modules
        ctx.fillStyle = config.fgColor;
        for (let r = 0; r < moduleCount; r++) {
          for (let c = 0; c < moduleCount; c++) {
            if (isEye(r, c)) continue;

            if (modules.get(r, c)) {
              if (isCoveredByLogo(r, c)) continue;

              const x = drawX + c * cellSize;
              const y = drawY + r * cellSize;
              const cx = x + cellSize/2;
              const cy = y + cellSize/2;

              // Neighbors
              const hasTop = r > 0 && modules.get(r-1, c) && !isCoveredByLogo(r-1, c) && !isEye(r-1, c);
              const hasBottom = r < moduleCount-1 && modules.get(r+1, c) && !isCoveredByLogo(r+1, c) && !isEye(r+1, c);
              const hasLeft = c > 0 && modules.get(r, c-1) && !isCoveredByLogo(r, c-1) && !isEye(r, c-1);
              const hasRight = c < moduleCount-1 && modules.get(r, c+1) && !isCoveredByLogo(r, c+1) && !isEye(r, c+1);

              switch(config.style) {
                  case QRStyle.MODERN:
                    ctx.beginPath();
                    // Larger fill
                    drawRoundRect(ctx, x, y, cellSize, cellSize, cellSize * 0.3);
                    ctx.fill();
                    break;
                  case QRStyle.SWISS:
                    ctx.beginPath();
                    // Full size circle
                    ctx.arc(cx, cy, cellSize/2 * 1.05, 0, Math.PI*2);
                    ctx.fill();
                    break;
                  case QRStyle.FLUID:
                    // REMOVE CONNECTIONS (Causes blobs). Use overlapping circles like Swiss.
                    ctx.beginPath();
                    ctx.arc(cx, cy, cellSize/2 * 1.1, 0, Math.PI*2);
                    ctx.fill();
                    break;
                  case QRStyle.CIRCUIT:
                    // Full square with very tiny notches
                    ctx.beginPath();
                    drawRoundRect(ctx, x, y, cellSize, cellSize, cellSize * 0.1);
                    ctx.fill();

                    // Draw lines to neighbors
                    const thickness = cellSize * 0.4;
                    if (hasRight) ctx.fillRect(cx, cy - thickness/2, cellSize/2 + 1, thickness);
                    if (hasBottom) ctx.fillRect(cx - thickness/2, cy, thickness, cellSize/2 + 1);
                    if (hasLeft) ctx.fillRect(x, cy - thickness/2, cellSize/2 + 1, thickness);
                    if (hasTop) ctx.fillRect(cx - thickness/2, y, thickness, cellSize/2 + 1);
                    break;
                  case QRStyle.HIVE:
                    // Massive Hexagon
                    drawPoly(ctx, cx, cy, cellSize/1.55, 6, 0, true);
                    break;
                  case QRStyle.GRUNGE:
                    // Full size rough rect, minimal jitter
                    drawRoughRect(ctx, x, y, cellSize, cellSize);
                    break;
                  case QRStyle.STARBURST:
                     // Fat star - nearly a square
                    drawStar(ctx, cx, cy, cellSize/1.5, cellSize/2.2, 5, true);
                    break;
                  case QRStyle.STANDARD:
                  default:
                    ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(cellSize), Math.ceil(cellSize));
                    break;
              }
            }
          }
        }

        // Draw Eyes (Last to ensure they overlap nicely if needed)
        drawEyePattern(0, 0);
        drawEyePattern(0, moduleCount - 7);
        drawEyePattern(moduleCount - 7, 0);

        // Draw Center Logo
        if (config.logoUrl && logoImg) {
            const lx = (displaySize - logoSizePx) / 2;
            const ly = (displaySize - logoSizePx) / 2;

            if (config.logoPaddingStyle !== 'none') {
                ctx.fillStyle = config.logoBackgroundColor || config.bgColor;
                if (config.logoPaddingStyle === 'circle') {
                    ctx.beginPath();
                    const radius = (logoSizePx / 2) + logoPaddingPx;
                    ctx.arc(displaySize/2, displaySize/2, radius, 0, Math.PI*2);
                    ctx.fill();
                } else {
                    const padding = logoPaddingPx;
                    ctx.fillRect(lx - padding, ly - padding, logoSizePx + (padding*2), logoSizePx + (padding*2));
                }
            }

            ctx.drawImage(logoImg, lx, ly, logoSizePx, logoSizePx);
        }

        // Draw Border Text and Logo
        if (config.isBorderEnabled && config.borderSize > 0) {
            const borderPx = displaySize * config.borderSize;
            if (config.borderText) {
                ctx.fillStyle = config.borderTextColor;
                const fontSize = borderPx * 0.4;
                ctx.font = `bold ${fontSize}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                let tx = displaySize / 2;
                let ty = borderPx / 2;

                if (config.borderTextPosition === 'bottom-center') {
                    ty = displaySize - (borderPx / 2);
                } else if (config.borderTextPosition === 'top-center') {
                    ty = borderPx / 2;
                }
                ctx.fillText(config.borderText, tx, ty);
            }

            if (config.borderLogoUrl && borderLogoImg) {
                const blSize = borderPx * 0.8;
                let blx = (displaySize - blSize) / 2;
                let bly = displaySize - borderPx + (borderPx - blSize) / 2;

                if (config.borderLogoPosition === 'bottom-center') {
                    blx = (displaySize - blSize) / 2;
                    bly = displaySize - borderPx + (borderPx - blSize) / 2;
                } else if (config.borderLogoPosition === 'bottom-right') {
                    blx = displaySize - borderPx - blSize;
                    bly = displaySize - borderPx + (borderPx - blSize) / 2;
                }
                ctx.drawImage(borderLogoImg, blx, bly, blSize, blSize);
            }
        }
      } catch (err) {
        console.warn("QR generation failed:", err);
      }
    };

    renderQR();
  }, [config, size, qrData, logoImg, borderLogoImg]);

  const typeLabel = config.type.charAt(0).toUpperCase() + config.type.slice(1).toLowerCase();
  const ariaLabel = `QR Code for ${typeLabel} - ${config.value ? 'Scan to view content' : 'Empty'}`;

  return (
    <div className={className} style={{ aspectRatio: '1/1' }}>
      <canvas
        ref={canvasRef}
        className="w-full h-auto block"
        style={{ aspectRatio: '1/1' }}
        role="img"
        aria-label={ariaLabel}
      />
    </div>
  );
};

export default QRCanvas;
