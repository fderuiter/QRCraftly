
import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { QRConfig, QRStyle } from '../types';

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

  useEffect(() => {
    /**
     * Renders the QR code onto the canvas.
     * This function handles module generation, styling, and logo embedding.
     */
    const renderQR = async () => {
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
      if (!config.value) {
        return;
      }

      try {
        // 1. Generate QR Data (Modules)
        const qrData = QRCode.create(config.value, { errorCorrectionLevel: config.errorCorrectionLevel });
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
        
        const drawRoundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
             // @ts-ignore
             if (ctx.roundRect) {
                 // @ts-ignore
                 ctx.roundRect(x, y, w, h, r);
             } else {
                 ctx.beginPath();
                 ctx.moveTo(x + r, y);
                 ctx.lineTo(x + w - r, y);
                 ctx.quadraticCurveTo(x + w, y, x + w, y + r);
                 ctx.lineTo(x + w, y + h - r);
                 ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
                 ctx.lineTo(x + r, y + h);
                 ctx.quadraticCurveTo(x, y + h, x, y + h - r);
                 ctx.lineTo(x, y + r);
                 ctx.quadraticCurveTo(x, y, x + r, y);
                 ctx.closePath();
             }
        };

        const drawPoly = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, sides: number, rotate: number = 0, fill: boolean = true) => {
            ctx.beginPath();
            for (let i = 0; i < sides; i++) {
                const theta = rotate + (i * 2 * Math.PI / sides);
                const px = x + r * Math.cos(theta);
                const py = y + r * Math.sin(theta);
                if (i===0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            if(fill) ctx.fill(); else ctx.stroke();
        };

        const drawStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, outerR: number, innerR: number, spikes: number, fill: boolean = true) => {
            let rot = Math.PI / 2 * 3;
            let x = cx;
            let y = cy;
            const step = Math.PI / spikes;

            ctx.beginPath();
            ctx.moveTo(cx, cy - outerR);
            for (let i = 0; i < spikes; i++) {
                x = cx + Math.cos(rot) * outerR;
                y = cy + Math.sin(rot) * outerR;
                ctx.lineTo(x, y);
                rot += step;

                x = cx + Math.cos(rot) * innerR;
                y = cy + Math.sin(rot) * innerR;
                ctx.lineTo(x, y);
                rot += step;
            }
            ctx.lineTo(cx, cy - outerR);
            ctx.closePath();
            if (fill) ctx.fill(); else ctx.stroke();
        };

        const drawRoughRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
             ctx.save();
             ctx.translate(x+w/2, y+h/2);
             ctx.rotate(0.02);
             ctx.fillRect(-w/2, -h/2, w, h);
             ctx.rotate(-0.04);
             ctx.fillStyle = config.eyeColor + "AA";
             ctx.fillRect(-w/2 + 1, -h/2 + 1, w-2, h-2);
             ctx.restore();
        };

        const drawScribble = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number) => {
            ctx.beginPath();
            ctx.moveTo(x, y);
            for(let i=0; i<10; i++) {
                ctx.lineTo(x + Math.random()*s, y + Math.random()*s);
            }
            ctx.stroke();
            ctx.fillRect(x + s*0.2, y + s*0.2, s*0.6, s*0.6);
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
                    // Frame
                    ctx.beginPath();
                    drawRoundRect(ctx, x, y, size, size, cellSize * 2.5);
                    ctx.globalCompositeOperation = 'destination-out';
                    drawRoundRect(ctx, x + cellSize, y + cellSize, size - 2*cellSize, size - 2*cellSize, cellSize * 1.5);
                    ctx.fill();
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.fillStyle = config.eyeColor;

                    // Eyeball
                    ctx.beginPath();
                    drawRoundRect(ctx, x + 2*cellSize, y + 2*cellSize, 3*cellSize, 3*cellSize, cellSize);
                    ctx.fill();
                    break;

                case QRStyle.SWISS: // Swiss Dot
                    // Frame: Thin Ring
                    ctx.beginPath();
                    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
                    ctx.globalCompositeOperation = 'destination-out';
                    ctx.arc(cx, cy, (size / 2) - cellSize, 0, Math.PI * 2, true);
                    ctx.fill();
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.fillStyle = config.eyeColor;

                    // Eyeball: Floating Dot
                    ctx.beginPath();
                    ctx.arc(cx, cy, 1.5 * cellSize, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case QRStyle.FLUID: // Fluid (Loop + Distorted Drop)
                    // Frame: Smooth thick ring
                    ctx.beginPath();
                    ctx.arc(cx, cy, size/2, 0, Math.PI*2);
                    ctx.globalCompositeOperation = 'destination-out';
                    ctx.arc(cx, cy, (size/2) - cellSize, 0, Math.PI*2, true);
                    ctx.fill();
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.fillStyle = config.eyeColor;

                    // Eyeball: Teardrop
                    ctx.beginPath();
                    ctx.arc(cx, cy + cellSize * 0.5, cellSize * 1.2, 0, Math.PI, false); // Bottom half
                    ctx.lineTo(cx, cy - cellSize * 1.5); // Top point
                    ctx.closePath();
                    ctx.fill();
                    break;

                case QRStyle.CIRCUIT: // Cyber-Circuit (Brackets + Notched)
                     // Frame: Brackets
                     ctx.lineWidth = cellSize;
                     ctx.strokeStyle = config.eyeColor;
                     ctx.lineCap = 'butt';
                     const bLen = 2 * cellSize;

                     // TL
                     ctx.beginPath(); ctx.moveTo(x + bLen, y + cellSize/2); ctx.lineTo(x + cellSize/2, y + cellSize/2); ctx.lineTo(x + cellSize/2, y + bLen); ctx.stroke();
                     // TR
                     ctx.beginPath(); ctx.moveTo(x + size - bLen, y + cellSize/2); ctx.lineTo(x + size - cellSize/2, y + cellSize/2); ctx.lineTo(x + size - cellSize/2, y + bLen); ctx.stroke();
                     // BL
                     ctx.beginPath(); ctx.moveTo(x + bLen, y + size - cellSize/2); ctx.lineTo(x + cellSize/2, y + size - cellSize/2); ctx.lineTo(x + cellSize/2, y + size - bLen); ctx.stroke();
                     // BR
                     ctx.beginPath(); ctx.moveTo(x + size - bLen, y + size - cellSize/2); ctx.lineTo(x + size - cellSize/2, y + size - cellSize/2); ctx.lineTo(x + size - cellSize/2, y + size - bLen); ctx.stroke();

                     // Eyeball: Notched Square
                     ctx.beginPath();
                     ctx.moveTo(x + 2*cellSize, y + 2*cellSize);
                     ctx.lineTo(x + 5*cellSize, y + 2*cellSize);
                     ctx.lineTo(x + 5*cellSize, y + 4*cellSize); // Notch
                     ctx.lineTo(x + 4*cellSize, y + 5*cellSize);
                     ctx.lineTo(x + 2*cellSize, y + 5*cellSize);
                     ctx.closePath();
                     ctx.fill();
                     break;

                case QRStyle.HIVE: // Hexagon
                    // Frame: Hex Ring
                    drawPoly(ctx, cx, cy, size/2, 6, 0, true);
                    ctx.globalCompositeOperation = 'destination-out';
                    drawPoly(ctx, cx, cy, size/2 - cellSize, 6, 0, true);
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.fillStyle = config.eyeColor;

                    // Eyeball: Solid Hex
                    drawPoly(ctx, cx, cy, 1.5 * cellSize, 6, 0, true);
                    break;

                case QRStyle.KINETIC: // Diamond
                    // Frame: Diamond Outline
                    ctx.beginPath();
                    ctx.moveTo(cx, y);
                    ctx.lineTo(x + size, cy);
                    ctx.lineTo(cx, y + size);
                    ctx.lineTo(x, cy);
                    ctx.closePath();
                    ctx.fill();

                    // Inner cutout
                    ctx.globalCompositeOperation = 'destination-out';
                    ctx.beginPath();
                    ctx.moveTo(cx, y + cellSize);
                    ctx.lineTo(x + size - cellSize, cy);
                    ctx.lineTo(cx, y + size - cellSize);
                    ctx.lineTo(x + cellSize, cy);
                    ctx.closePath();
                    ctx.fill();
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.fillStyle = config.eyeColor;

                    // Eyeball: Solid Diamond
                    ctx.beginPath();
                    ctx.moveTo(cx, y + 2*cellSize);
                    ctx.lineTo(x + size - 2*cellSize, cy);
                    ctx.lineTo(cx, y + size - 2*cellSize);
                    ctx.lineTo(x + 2*cellSize, cy);
                    ctx.fill();
                    break;

                case QRStyle.GRUNGE: // Grunge
                    // Frame
                    drawRoughRect(ctx, x, y, size, size);
                    ctx.globalCompositeOperation = 'destination-out';
                    ctx.fillRect(x + cellSize, y + cellSize, size - 2*cellSize, size - 2*cellSize);
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.fillStyle = config.eyeColor;

                    // Eyeball
                    drawScribble(ctx, x + 2*cellSize, y + 2*cellSize, 3*cellSize);
                    break;

                case QRStyle.STARBURST:
                     // Frame: Spiky Ring
                     drawStar(ctx, cx, cy, size/2, size/2 - cellSize/2, 12, true);
                     ctx.globalCompositeOperation = 'destination-out';
                     ctx.beginPath();
                     ctx.arc(cx, cy, size/2 - cellSize, 0, Math.PI*2);
                     ctx.fill();
                     ctx.globalCompositeOperation = 'source-over';
                     ctx.fillStyle = config.eyeColor;

                     // Eyeball: Star
                     drawStar(ctx, cx, cy, 1.5*cellSize, 0.7*cellSize, 5, true);
                     break;

                case QRStyle.STANDARD:
                default:
                    // Standard
                    ctx.fillRect(x, y, size, size);
                    ctx.clearRect(x + cellSize, y + cellSize, size - 2*cellSize, size - 2*cellSize);
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
                    drawRoundRect(ctx, x, y, cellSize, cellSize, cellSize * 0.4);
                    ctx.fill();
                    break;
                  case QRStyle.SWISS:
                    ctx.beginPath();
                    ctx.arc(cx, cy, cellSize/2.5, 0, Math.PI*2);
                    ctx.fill();
                    break;
                  case QRStyle.FLUID:
                    ctx.beginPath();
                    ctx.arc(cx, cy, cellSize/2 + 0.5, 0, Math.PI*2); // +0.5 to reduce gaps
                    ctx.fill();
                    // Connect neighbors
                    if (hasRight) ctx.fillRect(cx, y, cellSize/2 + 1, cellSize);
                    if (hasBottom) ctx.fillRect(x, cy, cellSize, cellSize/2 + 1);
                    if (hasLeft) ctx.fillRect(x, y, cellSize/2 + 1, cellSize);
                    if (hasTop) ctx.fillRect(x, y, cellSize, cellSize/2 + 1);
                    break;
                  case QRStyle.CIRCUIT:
                    // Center node
                    ctx.fillRect(cx - cellSize*0.15, cy - cellSize*0.15, cellSize*0.3, cellSize*0.3);
                    // Lines
                    const thickness = cellSize * 0.15;
                    if (hasRight) ctx.fillRect(cx, cy - thickness/2, cellSize/2 + 1, thickness);
                    if (hasBottom) ctx.fillRect(cx - thickness/2, cy, thickness, cellSize/2 + 1);
                    if (hasLeft) ctx.fillRect(x, cy - thickness/2, cellSize/2 + 1, thickness);
                    if (hasTop) ctx.fillRect(cx - thickness/2, y, thickness, cellSize/2 + 1);
                    break;
                  case QRStyle.HIVE:
                    drawPoly(ctx, cx, cy, cellSize/1.8, 6, 0, true);
                    break;
                  case QRStyle.KINETIC:
                    ctx.save();
                    ctx.translate(cx, cy);
                    ctx.rotate(Math.PI/4);
                    ctx.fillRect(-cellSize/2.2, -cellSize/2.2, cellSize/1.1, cellSize/1.1);
                    ctx.restore();
                    break;
                  case QRStyle.GRUNGE:
                    ctx.fillRect(x + Math.random()*2, y + Math.random()*2, cellSize-2, cellSize-2);
                    break;
                  case QRStyle.STARBURST:
                    drawStar(ctx, cx, cy, cellSize/2, cellSize/4, 5, true);
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
        if (config.logoUrl) {
          const logoImg = new Image();
          logoImg.crossOrigin = 'Anonymous';
          logoImg.src = config.logoUrl;
          
          await new Promise((resolve) => {
            logoImg.onload = resolve;
            logoImg.onerror = resolve;
          });

          if (logoImg.complete) {
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

            if (config.borderLogoUrl) {
                const borderLogoImg = new Image();
                borderLogoImg.crossOrigin = 'Anonymous';
                borderLogoImg.src = config.borderLogoUrl;

                await new Promise((resolve) => {
                    borderLogoImg.onload = resolve;
                    borderLogoImg.onerror = resolve;
                });

                if (borderLogoImg.complete) {
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
        }
      } catch (err) {
        console.warn("QR generation failed:", err);
      }
    };

    renderQR();
  }, [config, size]);

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
