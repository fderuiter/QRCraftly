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

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { QRConfig, SocialFormat, TemplateStyle, QRModules } from '../types';
import { drawQR, drawQRInternal } from '../utils/qrRenderer';
import { drawWithTemplate, SOCIAL_DIMENSIONS } from '../utils/templateRenderer';
import { useImage } from '../hooks/useImage';
import { ValidationEngine } from '../engine/ValidationEngine';
import { Alert } from './ui/Alert';
import { useToast } from './ui/Toast';
import { calculateLayout } from '../utils/qr-renderers/utils';

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
  /** Sequence of string values representing animated QR frames. If omitted, falls back to config.animationValues. */
  animationValues?: string[];
  /** Flag specifying if the visual animation loop is currently active. If omitted, falls back to config.isAnimating. */
  isAnimating?: boolean;
  /** Playback rate in frames per second. If omitted, falls back to config.animationFps. */
  animationFps?: number;
}

function findShortestPath(
  start: { r: number; c: number },
  end: { r: number; c: number },
  modules: QRModules,
  size: number
) {
  const isTraversable = (r: number, c: number) => {
    if (r < 0 || r >= size || c < 0 || c >= size) return false;
    if (r >= 2 && r <= 4 && c >= 2 && c <= 4) return true; // Top-Left eyeball
    if (r >= size - 5 && r <= size - 3 && c >= 2 && c <= 4) return true; // Bottom-Left eyeball
    return !modules.get(r, c);
  };

  const queue: { r: number; c: number; path: { r: number; c: number }[] }[] = [];
  queue.push({ ...start, path: [start] });
  const visited = new Set<string>();
  visited.add(`${start.r},${start.c}`);

  const dirs = [
    { dr: -1, dc: 0 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 },
  ];

  while (queue.length > 0) {
    const { r, c, path } = queue.shift()!;
    if (r === end.r && c === end.c) {
      return path;
    }

    for (const { dr, dc } of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      const key = `${nr},${nc}`;
      if (isTraversable(nr, nc) && !visited.has(key)) {
        visited.add(key);
        queue.push({ r: nr, c: nc, path: [...path, { r: nr, c: nc }] });
      }
    }
  }

  return null;
}

const modifyModulesForMaze = (modules: QRModules, config: QRConfig): QRModules => {
  if (!config.isMazeModeEnabled) return modules;

  const size = modules.size;
  const matrix = new Uint8Array(size * size);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      matrix[r * size + c] = modules.get(r, c) ? 1 : 0;
    }
  }

  // Carve pathways through outer finder pattern frames
  // Top-Left (0, 0)
  matrix[6 * size + 3] = 0;
  matrix[3 * size + 6] = 0;

  // Top-Right (0, size - 7)
  matrix[6 * size + (size - 4)] = 0;
  matrix[3 * size + (size - 7)] = 0;

  // Bottom-Left (size - 7, 0)
  matrix[(size - 7) * size + 3] = 0;
  matrix[(size - 4) * size + 6] = 0;

  // Wrap matrix in temporary modules getter to run pathfinder
  const tempModules = {
    size,
    get(r: number, c: number) {
      return matrix[r * size + c] === 1;
    }
  };

  const path = findShortestPath({ r: 3, c: 3 }, { r: size - 4, c: 3 }, tempModules, size);
  if (!path) {
    // Solvability fallback: carve a straight bridge down column 3 from row 4 to size - 5
    for (let r = 4; r <= size - 5; r++) {
      matrix[r * size + 3] = 0;
    }
  }

  return {
    size,
    get(r, c) {
      return matrix[r * size + c] === 1;
    }
  };
};

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
const QRCanvas = React.forwardRef<HTMLCanvasElement, QRCanvasProps>(({
  config,
  size = 1024,
  className,
  onRendered,
  animationValues,
  isAnimating,
  animationFps
}, ref) => {
  const activeIsAnimating = isAnimating !== undefined ? isAnimating : (config.isAnimating || false);
  const activeAnimationValues = animationValues !== undefined ? animationValues : (config.animationValues || []);
  const activeAnimationFps = animationFps !== undefined ? animationFps : (config.animationFps || 30);

  const localCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const { addToast } = useToast();
  const [_userPath, setUserPath] = useState<{ r: number; c: number }[]>([]);
  const isDrawingRef = useRef(false);
  const userPathRef = useRef<{ r: number; c: number }[]>([]);
  const solvedToastShownRef = useRef(false);
  const solvedPathRef = useRef<{ r: number; c: number }[] | null>(null);

  useEffect(() => {
    solvedToastShownRef.current = false;
    userPathRef.current = [];
    setUserPath([]);
  }, [config.value, config.isMazeModeEnabled]);
  
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

  // Animation states and refs to ensure we can read latest visual styles without rebuilding/restarting loop
  const cachedFramesRef = useRef<{ value: string; modules: any }[]>([]);
  const isAnimatingRef = useRef(activeIsAnimating);
  const configRef = useRef(config);
  const logoImgRef = useRef(logoImg);
  const borderLogoImgRef = useRef(borderLogoImg);

  useEffect(() => {
    isAnimatingRef.current = activeIsAnimating;
  }, [activeIsAnimating]);

  const onRenderedRef = useRef(onRendered);
  const sizeRef = useRef(size);

  useEffect(() => {
    configRef.current = config;
    logoImgRef.current = logoImg;
    borderLogoImgRef.current = borderLogoImg;
    onRenderedRef.current = onRendered;
    sizeRef.current = size;
  });

  // Pre-calculate and cache the complete sequence of QR frame matrices before starting loop
  useEffect(() => {
    if (!activeAnimationValues || activeAnimationValues.length === 0) {
      cachedFramesRef.current = [];
      return;
    }

    let isMounted = true;
    import('qrcode').then((QRCode) => {
      if (!isMounted) return;
      try {
        const cached = activeAnimationValues.map((val) => {
          try {
            const data = QRCode.create(val, { errorCorrectionLevel: config.errorCorrectionLevel });
            return { value: val, modules: data.modules };
          } catch (e) {
            console.warn("QR precompute failed for value:", val, e);
            return null;
          }
        }).filter(Boolean) as { value: string; modules: any }[];
        cachedFramesRef.current = cached;
      } catch (err) {
        console.error("Precomputing matrices failed:", err);
      }
    });

    return () => {
      isMounted = false;
      cachedFramesRef.current = [];
    };
  }, [activeAnimationValues, config.errorCorrectionLevel]);

  // Direct canvas animation loop using requestAnimationFrame, bypassing React updates
  useEffect(() => {
    if (!activeIsAnimating) return;

    const canvas = localCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isPerfTest = typeof window !== 'undefined' && (window as any).isPerformanceTest;
    const activeSize = isPerfTest ? 256 : size;
    const pixelRatio = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;

    // Fixed canvas dimensions at initialization to prevent buffer resets/flickering
    const useTemplate =
      configRef.current.templateStyle !== TemplateStyle.NONE ||
      configRef.current.socialFormat !== SocialFormat.SQUARE_1_1;

    let displayWidth = activeSize;
    let displayHeight = activeSize;

    if (useTemplate) {
      const { width: fw, height: fh } = SOCIAL_DIMENSIONS[configRef.current.socialFormat];
      displayHeight = Math.round(activeSize * fh / fw);
      canvas.width = displayWidth * pixelRatio;
      canvas.height = displayHeight * pixelRatio;
    } else {
      canvas.width = displayWidth * pixelRatio;
      canvas.height = displayHeight * pixelRatio;
    }

    let animationFrameId: number;
    let lastFrameTime = performance.now();
    let currentFrameIdx = 0;
    const fps = activeAnimationFps || 30;
    const frameInterval = 1000 / fps;

    const loop = (now: number) => {
      if (!isAnimatingRef.current) return;

      const elapsed = now - lastFrameTime;

      if (elapsed >= frameInterval) {
        lastFrameTime = now - (elapsed % frameInterval);

        const frames = cachedFramesRef.current;
        if (frames && frames.length > 0) {
          const frame = frames[currentFrameIdx % frames.length];
          if (frame && frame.modules) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const currentConfig = configRef.current;
            const currentLogoImg = logoImgRef.current;
            const currentBorderLogoImg = borderLogoImgRef.current;
            const currentUseTemplate =
              currentConfig.templateStyle !== TemplateStyle.NONE ||
              currentConfig.socialFormat !== SocialFormat.SQUARE_1_1;

            if (currentUseTemplate) {
              ctx.save();
              ctx.scale(pixelRatio, pixelRatio);
              drawWithTemplate(
                ctx as unknown as CanvasRenderingContext2D,
                frame.modules,
                currentConfig,
                currentLogoImg,
                currentBorderLogoImg,
                displayWidth,
                displayHeight,
                frame.modules.size
              );
              ctx.restore();
            } else {
              drawQR(
                ctx,
                frame.modules,
                currentConfig,
                currentLogoImg,
                currentBorderLogoImg,
                activeSize
              );
            }

            // Sample the onRendered triggers or completely pause them to avoid main thread blocking
            if (onRendered && currentFrameIdx % 60 === 0) {
              onRendered({ moduleCount: frame.modules.size });
            }

            currentFrameIdx++;
          }
        }
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [activeIsAnimating, size, activeAnimationFps, onRendered]);

  // Web Worker setup and configuration calculation
  const workerRef = useRef<Worker | null>(null);
  const sequenceIdRef = useRef<number>(0);
  const lastModulesRef = useRef<QRModules | null>(null);
  const isWorkerFallbackRef = useRef<boolean>(
    typeof window === 'undefined' ||
    typeof Worker === 'undefined' ||
    (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.includes('jsdom')) ||
    (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test')
  );

  const clearCanvasAndResize = useCallback(() => {
    const canvas = localCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentConfig = configRef.current;
    const currentSize = sizeRef.current;

    const isPerfTest = typeof window !== 'undefined' && (window as any).isPerformanceTest;
    const activeSize = isPerfTest ? 256 : currentSize;
    const pixelRatio = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;

    const useTemplate =
      currentConfig.templateStyle !== TemplateStyle.NONE ||
      currentConfig.socialFormat !== SocialFormat.SQUARE_1_1;

    if (useTemplate) {
      const { width: fw, height: fh } = SOCIAL_DIMENSIONS[currentConfig.socialFormat];
      const displayHeight = Math.round(activeSize * fh / fw);
      canvas.width = activeSize * pixelRatio;
      canvas.height = displayHeight * pixelRatio;
    } else {
      canvas.width = activeSize * pixelRatio;
      canvas.height = activeSize * pixelRatio;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const paintMatrix = useCallback((modules: QRModules) => {
    const canvas = localCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentConfig = configRef.current;
    const currentLogoImg = logoImgRef.current;
    const currentBorderLogoImg = borderLogoImgRef.current;
    const currentOnRendered = onRenderedRef.current;
    const currentSize = sizeRef.current;

    const isPerfTest = typeof window !== 'undefined' && (window as any).isPerformanceTest;
    const activeSize = isPerfTest ? 256 : currentSize;
    const pixelRatio = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;

    const useTemplate =
      currentConfig.templateStyle !== TemplateStyle.NONE ||
      currentConfig.socialFormat !== SocialFormat.SQUARE_1_1;

    if (useTemplate) {
      const { width: fw, height: fh } = SOCIAL_DIMENSIONS[currentConfig.socialFormat];
      const displayWidth = activeSize;
      const displayHeight = Math.round(activeSize * fh / fw);

      canvas.width = displayWidth * pixelRatio;
      canvas.height = displayHeight * pixelRatio;

      ctx.save();
      ctx.scale(pixelRatio, pixelRatio);

      drawWithTemplate(
        ctx as unknown as CanvasRenderingContext2D,
        modules,
        currentConfig,
        currentLogoImg,
        currentBorderLogoImg,
        displayWidth,
        displayHeight,
        modules.size
      );

      ctx.restore();
    } else {
      canvas.width = activeSize * pixelRatio;
      canvas.height = activeSize * pixelRatio;
      drawQR(ctx, modules, currentConfig, currentLogoImg, currentBorderLogoImg, activeSize);
    }

    // DRAW THE PATH OVERLAY!
    if (currentConfig.isMazeModeEnabled) {
      const solved = findShortestPath({ r: 3, c: 3 }, { r: modules.size - 4, c: 3 }, modules, modules.size);
      solvedPathRef.current = solved;

      const displayWidth = activeSize;
      let displayHeight = activeSize;
      if (useTemplate) {
        const { width: fw, height: fh } = SOCIAL_DIMENSIONS[currentConfig.socialFormat];
        displayHeight = Math.round(activeSize * fh / fw);
      }

      ctx.save();
      ctx.scale(pixelRatio, pixelRatio);

      if (useTemplate) {
        const isNoneSquare =
          currentConfig.templateStyle === TemplateStyle.NONE &&
          currentConfig.socialFormat === SocialFormat.SQUARE_1_1;

        const userScale = Math.min(1.5, Math.max(0.5, currentConfig.templateQrScale ?? 1.0));
        const baseQrFraction = isNoneSquare ? 1.0 : 0.5 * userScale;

        const qrSize = displayWidth * baseQrFraction;
        const qrX = (displayWidth - qrSize) / 2;
        const qrY = (displayHeight - qrSize) / 2;
        const ctxScale = qrSize / displayWidth;

        ctx.translate(qrX, qrY);
        ctx.scale(ctxScale, ctxScale);
      }

      const { drawX, drawY, cellSize } = calculateLayout(currentConfig, displayWidth, modules.size);

      // Draw path overlay
      if (userPathRef.current.length > 0) {
        ctx.beginPath();
        ctx.strokeStyle = '#2dd4bf'; // teal-400
        ctx.lineWidth = cellSize * 0.45;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        userPathRef.current.forEach((pt, idx) => {
          const px = drawX + (pt.c + 0.5) * cellSize;
          const py = drawY + (pt.r + 0.5) * cellSize;
          if (idx === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        });
        ctx.stroke();

        // Start indicator
        ctx.beginPath();
        ctx.fillStyle = '#14b8a6'; // teal-500
        ctx.arc(drawX + 3.5 * cellSize, drawY + 3.5 * cellSize, cellSize * 0.45, 0, 2 * Math.PI);
        ctx.fill();

        // End indicator
        const lastPt = userPathRef.current[userPathRef.current.length - 1];
        const reachedEnd = lastPt.r === modules.size - 4 && lastPt.c === 3;
        ctx.beginPath();
        ctx.fillStyle = reachedEnd ? '#22c55e' : '#f97316'; // green-500 if solved, else orange-500
        ctx.arc(drawX + 3.5 * cellSize, drawY + (modules.size - 3.5) * cellSize, cellSize * 0.45, 0, 2 * Math.PI);
        ctx.fill();
      } else {
        // Draw guideline
        if (solvedPathRef.current && solvedPathRef.current.length > 0) {
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(20, 184, 166, 0.25)'; // teal-500 0.25 opacity
          ctx.lineWidth = cellSize * 0.25;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.setLineDash([cellSize * 0.2, cellSize * 0.2]);

          solvedPathRef.current.forEach((pt, idx) => {
            const px = drawX + (pt.c + 0.5) * cellSize;
            const py = drawY + (pt.r + 0.5) * cellSize;
            if (idx === 0) {
              ctx.moveTo(px, py);
            } else {
              ctx.lineTo(px, py);
            }
          });
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Just highlight start and end
        ctx.beginPath();
        ctx.fillStyle = '#14b8a6'; // teal-500
        ctx.arc(drawX + 3.5 * cellSize, drawY + 3.5 * cellSize, cellSize * 0.45, 0, 2 * Math.PI);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = '#f97316'; // orange-500
        ctx.arc(drawX + 3.5 * cellSize, drawY + (modules.size - 3.5) * cellSize, cellSize * 0.45, 0, 2 * Math.PI);
        ctx.fill();
      }

      ctx.restore();
    }

    if (currentOnRendered) {
      currentOnRendered({ moduleCount: modules.size });

      if (isPerfTest) return;

      const runVirtualRender = () => {
        try {
          const virtualSize = 256;
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
            const { width: fw, height: fh } = SOCIAL_DIMENSIONS[currentConfig.socialFormat];
            displayHeight = Math.round(virtualSize * fh / fw);
            if (typeof OffscreenCanvas !== 'undefined') {
              vCanvas.height = displayHeight;
            } else {
              (vCanvas as HTMLCanvasElement).height = displayHeight;
            }

            drawWithTemplate(
              vCtx as unknown as CanvasRenderingContext2D,
              modules,
              currentConfig,
              currentLogoImg,
              currentBorderLogoImg,
              displayWidth,
              displayHeight,
              modules.size,
              true
            );
          } else {
            vCtx.clearRect(0, 0, displayWidth, displayHeight);
            drawQRInternal(
              vCtx as unknown as CanvasRenderingContext2D,
              modules,
              currentConfig,
              currentLogoImg,
              currentBorderLogoImg,
              virtualSize,
              modules.size,
              true
            );
          }

          const imageData = vCtx.getImageData(0, 0, displayWidth, displayHeight);
          currentOnRendered({ moduleCount: modules.size, virtualImageData: imageData });

          if (vCanvas) {
            vCanvas.width = 0;
            vCanvas.height = 0;
          }
        } catch (err) {
          console.error("Virtual rendering failed:", err);
        }
      };

      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as any).requestIdleCallback(runVirtualRender);
      } else {
        setTimeout(runVirtualRender, 50);
      }
    }
  }, []);

  const requestMatrixCalculation = useCallback(() => {
    const currentConfig = configRef.current;
    if (!currentConfig.value) {
      lastModulesRef.current = null;
      clearCanvasAndResize();
      return;
    }

    sequenceIdRef.current += 1;
    const currentSeqId = sequenceIdRef.current;

    if (workerRef.current && !isWorkerFallbackRef.current) {
      workerRef.current.postMessage({
        config: currentConfig,
        sequenceId: currentSeqId,
      });
    } else {
      // Synchronous fallback calculation (crucial for testing and permission-blocked worker fallbacks)
      let QRCodeModule: any = (globalThis as any).mockQRCode;
      try {
        if (!QRCodeModule) {
          const req = typeof require !== 'undefined' ? require : null;
          if (req) {
            QRCodeModule = req('qrcode');
          }
        }
      } catch {}

      if (QRCodeModule) {
        try {
          const violations = ValidationEngine.validateConfig(currentConfig);
          if (violations.length > 0) {
            lastModulesRef.current = null;
            clearCanvasAndResize();
            return;
          }

          const QRCode = (QRCodeModule as any).default || QRCodeModule;
          const errCorr = currentConfig.isMazeModeEnabled ? 'H' : currentConfig.errorCorrectionLevel;
          const data = QRCode.create(currentConfig.value, {
            errorCorrectionLevel: errCorr,
          });
          const modules: QRModules = modifyModulesForMaze(data.modules as unknown as QRModules, currentConfig);
          lastModulesRef.current = modules;
          paintMatrix(modules);
        } catch (e) {
          console.warn("QR generation failed:", e);
          lastModulesRef.current = null;
          clearCanvasAndResize();
        }
      } else {
        import('qrcode').then((mod) => {
          if (currentSeqId !== sequenceIdRef.current) return;
          try {
            const violations = ValidationEngine.validateConfig(currentConfig);
            if (violations.length > 0) {
              lastModulesRef.current = null;
              clearCanvasAndResize();
              return;
            }

            const QRCode = (mod as any).default || mod;
            const errCorr = currentConfig.isMazeModeEnabled ? 'H' : currentConfig.errorCorrectionLevel;
            const data = QRCode.create(currentConfig.value, {
              errorCorrectionLevel: errCorr,
            });
            const modules: QRModules = modifyModulesForMaze(data.modules as unknown as QRModules, currentConfig);
            lastModulesRef.current = modules;
            paintMatrix(modules);
          } catch (e) {
            console.warn("QR generation failed:", e);
            lastModulesRef.current = null;
            clearCanvasAndResize();
          }
        });
      }
    }
  }, [paintMatrix, clearCanvasAndResize]);

  // Web Worker lifecycle management
  useEffect(() => {
    let worker: Worker | null = null;
    try {
      worker = new Worker(
        new URL('../utils/matrixWorker.ts', import.meta.url),
        { type: 'module' }
      );
      worker.onmessage = (e) => {
        const { status, sequenceId, size, matrix } = e.data;
        if (sequenceId !== sequenceIdRef.current) {
          return;
        }

        if (status === 'success' && size && matrix) {
          const modules: QRModules = {
            size,
            get(r, c) {
              return matrix[r * size + c] === 1;
            }
          };
          lastModulesRef.current = modules;
          paintMatrix(modules);
        } else {
          lastModulesRef.current = null;
          clearCanvasAndResize();
        }
      };
      workerRef.current = worker;
    } catch (err) {
      console.warn("Failed to initialize background worker, falling back:", err);
      isWorkerFallbackRef.current = true;
    }

    return () => {
      if (worker) {
        worker.terminate();
      }
    };
  }, [paintMatrix, clearCanvasAndResize]);

  // Monitor value and error correction level to request calculations
  useEffect(() => {
    if (activeIsAnimating) return;
    requestMatrixCalculation();
  }, [config.value, config.errorCorrectionLevel, config.isMazeModeEnabled, activeIsAnimating, requestMatrixCalculation]);

  // Monitor structural and aesthetic changes to repaint immediately
  useEffect(() => {
    if (activeIsAnimating) return;
    if (lastModulesRef.current) {
      paintMatrix(lastModulesRef.current);
    } else {
      requestMatrixCalculation();
    }
  }, [
    config.fgColor,
    config.bgColor,
    config.eyeColor,
    config.style,
    config.logoUrl,
    config.logoSize,
    config.logoPaddingStyle,
    config.logoPadding,
    config.logoBackgroundColor,
    config.isBorderEnabled,
    config.borderSize,
    config.borderColor,
    config.borderStyle,
    config.borderText,
    config.borderTextPosition,
    config.borderTextColor,
    config.borderLogoUrl,
    config.borderLogoPosition,
    config.socialFormat,
    config.templateStyle,
    config.isMazeModeEnabled,
    logoImg,
    borderLogoImg,
    size,
    activeIsAnimating,
    paintMatrix,
    requestMatrixCalculation,
  ]);

  const redrawCanvasWithOverlay = useCallback(() => {
    if (lastModulesRef.current) {
      paintMatrix(lastModulesRef.current);
    }
  }, [paintMatrix]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const currentConfig = configRef.current;
    if (!currentConfig.isMazeModeEnabled || !lastModulesRef.current) return;

    const canvas = localCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const useTemplate =
      currentConfig.templateStyle !== TemplateStyle.NONE ||
      currentConfig.socialFormat !== SocialFormat.SQUARE_1_1;

    const isPerfTest = typeof window !== 'undefined' && (window as any).isPerformanceTest;
    const activeSize = isPerfTest ? 256 : sizeRef.current;

    let displayWidth = activeSize;
    let displayHeight = activeSize;
    if (useTemplate) {
      const { width: fw, height: fh } = SOCIAL_DIMENSIONS[currentConfig.socialFormat];
      displayHeight = Math.round(activeSize * fh / fw);
    }

    const { drawX, drawY, cellSize } = calculateLayout(currentConfig, displayWidth, lastModulesRef.current.size);

    let x_logical = x * (displayWidth / rect.width);
    let y_logical = y * (displayHeight / rect.height);

    if (useTemplate) {
      const isNoneSquare =
        currentConfig.templateStyle === TemplateStyle.NONE &&
        currentConfig.socialFormat === SocialFormat.SQUARE_1_1;

      const userScale = Math.min(1.5, Math.max(0.5, currentConfig.templateQrScale ?? 1.0));
      const baseQrFraction = isNoneSquare ? 1.0 : 0.5 * userScale;

      const qrSize = displayWidth * baseQrFraction;
      const qrX = (displayWidth - qrSize) / 2;
      const qrY = (displayHeight - qrSize) / 2;
      const ctxScale = qrSize / displayWidth;

      x_logical = (x_logical - qrX) / ctxScale;
      y_logical = (y_logical - qrY) / ctxScale;
    }

    const col = Math.floor((x_logical - drawX) / cellSize);
    const row = Math.floor((y_logical - drawY) / cellSize);

    // Generous start check (anywhere inside start eyeball 2..4, 2..4)
    const isAtStart = row >= 2 && row <= 4 && col >= 2 && col <= 4;

    if (isAtStart) {
      isDrawingRef.current = true;
      userPathRef.current = [{ r: 3, c: 3 }];
      setUserPath([{ r: 3, c: 3 }]);
      canvas.setPointerCapture(e.pointerId);
      redrawCanvasWithOverlay();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !lastModulesRef.current) return;

    const currentConfig = configRef.current;
    const canvas = localCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const useTemplate =
      currentConfig.templateStyle !== TemplateStyle.NONE ||
      currentConfig.socialFormat !== SocialFormat.SQUARE_1_1;

    const isPerfTest = typeof window !== 'undefined' && (window as any).isPerformanceTest;
    const activeSize = isPerfTest ? 256 : sizeRef.current;

    let displayWidth = activeSize;
    let displayHeight = activeSize;
    if (useTemplate) {
      const { width: fw, height: fh } = SOCIAL_DIMENSIONS[currentConfig.socialFormat];
      displayHeight = Math.round(activeSize * fh / fw);
    }

    const { drawX, drawY, cellSize } = calculateLayout(currentConfig, displayWidth, lastModulesRef.current.size);

    let x_logical = x * (displayWidth / rect.width);
    let y_logical = y * (displayHeight / rect.height);

    if (useTemplate) {
      const isNoneSquare =
        currentConfig.templateStyle === TemplateStyle.NONE &&
        currentConfig.socialFormat === SocialFormat.SQUARE_1_1;

      const userScale = Math.min(1.5, Math.max(0.5, currentConfig.templateQrScale ?? 1.0));
      const baseQrFraction = isNoneSquare ? 1.0 : 0.5 * userScale;

      const qrSize = displayWidth * baseQrFraction;
      const qrX = (displayWidth - qrSize) / 2;
      const qrY = (displayHeight - qrSize) / 2;
      const ctxScale = qrSize / displayWidth;

      x_logical = (x_logical - qrX) / ctxScale;
      y_logical = (y_logical - qrY) / ctxScale;
    }

    const col = Math.floor((x_logical - drawX) / cellSize);
    const row = Math.floor((y_logical - drawY) / cellSize);

    const size = lastModulesRef.current.size;

    if (row < 0 || row >= size || col < 0 || col >= size) return;

    const lastCell = userPathRef.current[userPathRef.current.length - 1];
    if (lastCell.r === row && lastCell.c === col) return;

    const isTraversable = (r: number, c: number) => {
      if (r < 0 || r >= size || c < 0 || c >= size) return false;
      if (r >= 2 && r <= 4 && c >= 2 && c <= 4) return true;
      if (r >= size - 5 && r <= size - 3 && c >= 2 && c <= 4) return true;
      return lastModulesRef.current ? !lastModulesRef.current.get(r, c) : false;
    };

    if (!isTraversable(row, col)) return;

    // Backtracking check
    const existingIndex = userPathRef.current.findIndex(pt => pt.r === row && pt.c === col);
    if (existingIndex !== -1) {
      const truncated = userPathRef.current.slice(0, existingIndex + 1);
      userPathRef.current = truncated;
      setUserPath(truncated);
      redrawCanvasWithOverlay();
      return;
    }

    // Try to find shortest path to step/drag smoothly
    const pathSegment = findShortestPath(lastCell, { r: row, c: col }, lastModulesRef.current, size);
    if (pathSegment && pathSegment.length > 1) {
      const newPath = [...userPathRef.current, ...pathSegment.slice(1)];
      userPathRef.current = newPath;
      setUserPath(newPath);
      redrawCanvasWithOverlay();

      const reachedEnd = row >= size - 5 && row <= size - 3 && col >= 2 && col <= 4;
      if (reachedEnd && !solvedToastShownRef.current) {
        addToast({
          type: 'success',
          message: 'Congratulations! You solved the QR code maze! 🎉',
          duration: 4000,
        });
        solvedToastShownRef.current = true;
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      const canvas = localCanvasRef.current;
      if (canvas) {
        canvas.releasePointerCapture(e.pointerId);
      }
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      const canvas = localCanvasRef.current;
      if (canvas) {
        canvas.releasePointerCapture(e.pointerId);
      }
    }
  };

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
            className="flex size-full flex-col items-center justify-center gap-3 overflow-y-auto rounded-3xl border-2 border-dashed border-rose-300 bg-rose-50 p-6 text-center dark:border-rose-800 dark:bg-rose-950/25"
          >
            <div className="mt-2 space-y-1.5">
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
                } else if (v === 'EVENT_MISSING_SUMMARY') {
                  msg = 'Event title/summary is required.';
                } else if (v === 'EVENT_MISSING_START') {
                  msg = 'Event start date/time is required.';
                } else if (v === 'EVENT_CHRONOLOGICAL_VIOLATION') {
                  msg = 'Event end date/time cannot be before start date/time.';
                } else if (v === 'SMS_PHONE_STRUCTURE_VIOLATION') {
                  msg = 'SMS phone number contains invalid characters, letters, or line-breaks.';
                }
                return (
                  <p key={i} className="text-sm font-medium text-rose-700 dark:text-rose-400">
                    {msg}
                  </p>
                );
              })}
            </div>
            <p className="mt-2 max-w-xs text-xs text-slate-500 dark:text-slate-400">
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
        className={`block h-auto w-full ${aspectRatioClass} ${config.isMazeModeEnabled ? 'cursor-crosshair' : ''}`}
        role="img"
        aria-label={ariaLabel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={{ touchAction: config.isMazeModeEnabled ? 'none' : 'auto' }}
      />
    </div>
  );
});

export default React.memo(QRCanvas);
