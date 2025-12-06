
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
        const qrData = QRCode.create(config.value, { errorCorrectionLevel: 'H' });
        const modules = qrData.modules;
        const moduleCount = modules.size;
        
        ctx.scale(pixelRatio, pixelRatio);
        
        // Fill Background
        ctx.fillStyle = config.bgColor;
        ctx.fillRect(0, 0, displaySize, displaySize);

        // Helper to determine if a module is an "eye"
        const isEye = (row: number, col: number): boolean => {
          if (row < 7 && col < 7) return true;
          if (row < 7 && col >= moduleCount - 7) return true;
          if (row >= moduleCount - 7 && col < 7) return true;
          return false;
        };

        const cellSize = displaySize / moduleCount;
        const logoSizePx = displaySize * config.logoSize;
        const logoPaddingPx = config.logoPadding * cellSize; // Padding in pixels based on module size
        
        // Calculate Center
        const center = moduleCount / 2;
        
        // The size of the logo IMAGE in terms of modules
        const logoImageModuleSize = config.logoSize * moduleCount;
        
        // The size of the CUTOUT (Image + Padding) in terms of modules
        // If style is none, we don't clear extra space, but we still might clear the image area
        const paddingModules = config.logoPaddingStyle === 'none' ? 0 : config.logoPadding;
        const cutoutModuleSize = logoImageModuleSize + (paddingModules * 2);

        // Logic to determine if a module should be skipped (hidden) for the logo
        const isCoveredByLogo = (r: number, c: number) => {
          if (!config.logoUrl) return false;
          
          // Coordinate space centered at 0,0
          const x = c - center + 0.5; // +0.5 to center on the module grid
          const y = r - center + 0.5;
          
          if (config.logoPaddingStyle === 'circle') {
            // Check distance from center
            const radius = (cutoutModuleSize / 2); 
            return (x * x + y * y) < (radius * radius);
          } else {
            // Square (default and 'none' for clearing purposes)
            const halfSize = (cutoutModuleSize / 2);
            return Math.abs(x) < halfSize && Math.abs(y) < halfSize;
          }
        };

        // Draw Modules
        for (let r = 0; r < moduleCount; r++) {
          for (let c = 0; c < moduleCount; c++) {
            if (modules.get(r, c)) {
              // Check if this module is hidden by logo
              if (isCoveredByLogo(r, c)) continue;

              const isEyeModule = isEye(r, c);
              ctx.fillStyle = isEyeModule ? config.eyeColor : config.fgColor;

              const x = c * cellSize;
              const y = r * cellSize;

              // Apply Style
              if (isEyeModule) {
                // Eyes are always clearer as simple shapes, but we can style them slightly
                ctx.beginPath();
                if (config.style === QRStyle.ROUNDED || config.style === QRStyle.DOTS) {
                    const radius = cellSize * 0.4;
                    ctx.roundRect(x, y, cellSize, cellSize, radius);
                } else if (config.style === QRStyle.DIAMOND) {
                    ctx.rect(x, y, cellSize, cellSize);
                } else {
                    ctx.rect(x, y, cellSize, cellSize);
                }
                ctx.fill();
              } else {
                // DATA MODULES
                if (config.style === QRStyle.DOTS) {
                  ctx.beginPath();
                  ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize / 2.5, 0, Math.PI * 2);
                  ctx.fill();
                } else if (config.style === QRStyle.ROUNDED) {
                  ctx.beginPath();
                  ctx.roundRect(x, y, cellSize, cellSize, cellSize * 0.35);
                  ctx.fill();
                } else if (config.style === QRStyle.DIAMOND) {
                   // Draw rotated square
                   const cx = x + cellSize / 2;
                   const cy = y + cellSize / 2;
                   const size = cellSize / 1.4; // Adjust size to fit when rotated
                   
                   ctx.save();
                   ctx.translate(cx, cy);
                   ctx.rotate(45 * Math.PI / 180);
                   ctx.beginPath();
                   ctx.rect(-size/2, -size/2, size, size);
                   ctx.fill();
                   ctx.restore();
                } else if (config.style === QRStyle.CROSS) {
                    // Draw a plus sign
                    const thickness = cellSize / 3;
                    const length = cellSize * 0.8;
                    const cx = x + cellSize / 2;
                    const cy = y + cellSize / 2;
                    
                    ctx.beginPath();
                    // Horizontal rect
                    ctx.rect(cx - length/2, cy - thickness/2, length, thickness);
                    // Vertical rect
                    ctx.rect(cx - thickness/2, cy - length/2, thickness, length);
                    ctx.fill();
                } else if (config.style === QRStyle.STAR) {
                    const cx = x + cellSize / 2;
                    const cy = y + cellSize / 2;
                    const outerRadius = cellSize / 2;
                    const innerRadius = cellSize / 4;
                    const spikes = 5;

                    ctx.beginPath();
                    for(let i=0; i<spikes*2; i++){
                        const r = (i%2 === 0) ? outerRadius : innerRadius;
                        const currX = cx + Math.cos(i * Math.PI / spikes - Math.PI / 2) * r;
                        const currY = cy + Math.sin(i * Math.PI / spikes - Math.PI / 2) * r;
                        if(i===0) ctx.moveTo(currX, currY);
                        else ctx.lineTo(currX, currY);
                    }
                    ctx.closePath();
                    ctx.fill();
                } else if (config.style === QRStyle.HEART) {
                    const cx = x + cellSize / 2;
                    const cy = y + cellSize / 2;
                    // Slightly reduce size to prevent overlapping
                    const size = cellSize * 0.9;

                    ctx.beginPath();
                    const topCurveHeight = size * 0.3;
                    ctx.moveTo(cx, cy + size * 0.2);
                    // Bezier curves for heart shape
                    ctx.bezierCurveTo(
                      cx, cy - size * 0.3,
                      cx - size * 0.5, cy - size * 0.3,
                      cx - size * 0.5, cy + topCurveHeight * 0.2
                    );
                    ctx.bezierCurveTo(
                      cx - size * 0.5, cy + (size + topCurveHeight) / 2,
                      cx, cy + size * 0.4,
                      cx, cy + size * 0.5
                    );
                    ctx.bezierCurveTo(
                      cx, cy + size * 0.4,
                      cx + size * 0.5, cy + (size + topCurveHeight) / 2,
                      cx + size * 0.5, cy + topCurveHeight * 0.2
                    );
                    ctx.bezierCurveTo(
                      cx + size * 0.5, cy - size * 0.3,
                      cx, cy - size * 0.3,
                      cx, cy + size * 0.2
                    );
                    ctx.fill();
                } else {
                  // Squares (Default)
                  ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(cellSize), Math.ceil(cellSize));
                }
              }
            }
          }
        }

        // Draw Logo
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
              
              // Draw background for logo to ensure contrast/separation
              if (config.logoPaddingStyle !== 'none') {
                  ctx.fillStyle = config.logoBackgroundColor || config.bgColor;
                  
                  if (config.logoPaddingStyle === 'circle') {
                      ctx.beginPath();
                      // Radius = half image + padding
                      const radius = (logoSizePx / 2) + logoPaddingPx;
                      ctx.arc(displaySize/2, displaySize/2, radius, 0, Math.PI*2);
                      ctx.fill();
                  } else {
                      // Square
                      const padding = logoPaddingPx;
                      ctx.fillRect(lx - padding, ly - padding, logoSizePx + (padding*2), logoSizePx + (padding*2));
                  }
              }
              
              ctx.drawImage(logoImg, lx, ly, logoSizePx, logoSizePx);
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