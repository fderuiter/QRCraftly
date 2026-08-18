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

import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { QRConfig, SocialFormat, TemplateStyle, QRModules, QRType } from '../types';
import { drawQR, drawQRInternal } from '../utils/qrRenderer';
import { drawWithTemplate, SOCIAL_DIMENSIONS } from '../utils/templateRenderer';
import { useImage } from '../hooks/useImage';
import { ValidationEngine } from '../engine/ValidationEngine';
import { Alert } from './ui/Alert';
import { normalizeUrl, shouldNormalizeUrl } from '../utils/url';
import { useOptionalQRStore } from '../context/QRContext';
import {
  isMazeWorkerRequest,
  isMazeWorkerResponse,
  assertMazeWorkerResponse,
  type MazeData,
} from '../utils/mazeContract';

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
  virtualImageData?: ImageData;
  /**
   *
   */
  virtualImageBitmap?: ImageBitmap; }) => void;
  /** Sequence of string values representing animated QR frames. If omitted, falls back to config.animationValues. */
  animationValues?: string[];
  /** Flag specifying if the visual animation loop is currently active. If omitted, falls back to config.isAnimating. */
  isAnimating?: boolean;
  /** Playback rate in frames per second. If omitted, falls back to config.animationFps. */
  animationFps?: number;
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
  
  // Use either the forwarded ref or the local one
  const handleRef = (node: HTMLCanvasElement | null) => {
    localCanvasRef.current = node;
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  };

  const [fallbackActive, setFallbackActive] = useState(false);

  const activeConfig = useMemo(() => {
    if (fallbackActive) {
      return { ...config, isMazeBridgesEnabled: false };
    }
    return config;
  }, [config, fallbackActive]);

  useEffect(() => {
    setFallbackActive(false);
  }, [
    config.value,
    config.style,
    config.fgColor,
    config.bgColor,
    config.eyeColor,
    config.errorCorrectionLevel,
    config.isMazeEnabled,
    config.isMazeBridgesEnabled,
  ]);

  const store = useOptionalQRStore();

  useEffect(() => {
    if (!store) return;
    const unregister = store.registerSignal('scannability-fail', () => {
      setFallbackActive(true);
    });
    return () => {
      unregister();
    };
  }, [store]);

  // Pre-load images to avoid async rendering and flickering
  const logoImg = useImage(activeConfig.logoUrl);
  const borderLogoImg = useImage(activeConfig.isBorderEnabled ? activeConfig.borderLogoUrl : null);

  // Animation states and refs to ensure we can read latest visual styles without rebuilding/restarting loop
  const cachedFramesRef = useRef<{ value: string; modules: any }[]>([]);
  const isAnimatingRef = useRef(activeIsAnimating);
  const configRef = useRef(activeConfig);
  const logoImgRef = useRef(logoImg);
  const borderLogoImgRef = useRef(borderLogoImg);

  useEffect(() => {
    isAnimatingRef.current = activeIsAnimating;
  }, [activeIsAnimating]);

  const onRenderedRef = useRef(onRendered);
  const sizeRef = useRef(size);

  useEffect(() => {
    configRef.current = activeConfig;
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

  const mazeWorkerRef = useRef<Worker | null>(null);
  const mazeSequenceIdRef = useRef<number>(0);
  const isMazeWorkerFallbackRef = useRef<boolean>(
    typeof window === 'undefined' ||
    typeof Worker === 'undefined' ||
    (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.includes('jsdom')) ||
    (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test')
  );
  const [computedMazeData, setComputedMazeData] = useState<MazeData | null>(null);
  const computedMazeDataRef = useRef<MazeData | null>(null);

  useEffect(() => {
    computedMazeDataRef.current = computedMazeData;
  }, [computedMazeData]);

  const initMazeWorker = useCallback(() => {
    if (isMazeWorkerFallbackRef.current) return;

    if (mazeWorkerRef.current) {
      mazeWorkerRef.current.terminate();
      mazeWorkerRef.current = null;
    }

    try {
      const worker = new Worker(
        new URL('../utils/mazeWorker.ts', import.meta.url),
        { type: 'module' }
      );

      worker.onmessage = (e) => {
        // Strictly validate message format at runtime
        if (!isMazeWorkerResponse(e.data)) {
          assertMazeWorkerResponse(e.data);
        } else {
          assertMazeWorkerResponse(e.data);
        }

        const { status, sequenceId, mazeData, error } = e.data;
        if (sequenceId !== mazeSequenceIdRef.current) {
          return;
        }

        if (status === 'success' && mazeData) {
          setComputedMazeData(mazeData);
        } else {
          console.warn("Background maze calculation failed:", error);
        }
      };

      worker.onerror = (e) => {
        console.error("Maze background worker error, restarting:", e);
        // Crash recovery: terminate current process and spin up replacement
        initMazeWorker();
      };

      mazeWorkerRef.current = worker;
    } catch (err) {
      console.warn("Failed to initialize background maze worker, falling back:", err);
      isMazeWorkerFallbackRef.current = true;
    }
  }, []);

  useEffect(() => {
    initMazeWorker();
    return () => {
      if (mazeWorkerRef.current) {
        mazeWorkerRef.current.terminate();
        mazeWorkerRef.current = null;
      }
    };
  }, [initMazeWorker]);

  const requestMazeCalculation = useCallback((modules: QRModules) => {
    if (!activeConfig.isMazeEnabled) {
      setComputedMazeData(null);
      return;
    }

    mazeSequenceIdRef.current += 1;
    const currentSeqId = mazeSequenceIdRef.current;

    const size = modules.size;
    const matrix = new Uint8Array(size * size);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        matrix[r * size + c] = modules.get(r, c) ? 1 : 0;
      }
    }

    if (mazeWorkerRef.current && !isMazeWorkerFallbackRef.current) {
      const requestPayload = {
        size,
        matrix,
        config: activeConfig,
        sequenceId: currentSeqId,
      };

      // Strict validation before posting
      if (!isMazeWorkerRequest(requestPayload)) {
        throw new Error('Invalid MazeWorkerRequest payload built on main thread');
      }

      mazeWorkerRef.current.postMessage(requestPayload);
    } else {
      // Dynamic import fallback running pathfinding on main thread during idle time
      import('../utils/qr-renderers/maze').then((module) => {
        if (currentSeqId !== mazeSequenceIdRef.current) return;

        const runner = () => {
          if (currentSeqId !== mazeSequenceIdRef.current) return;
          try {
            const mazeData = module.generateMaze(modules, activeConfig, size);
            setComputedMazeData(mazeData);
          } catch (e) {
            console.warn("Main thread fallback maze generation failed:", e);
          }
        };

        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          (window as any).requestIdleCallback(runner);
        } else {
          setTimeout(runner, 0);
        }
      });
    }
  }, [activeConfig]);

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
    requestMazeCalculation(modules);
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
        modules.size,
        false,
        computedMazeDataRef.current
      );

      ctx.restore();
    } else {
      canvas.width = activeSize * pixelRatio;
      canvas.height = activeSize * pixelRatio;
      drawQR(ctx, modules, currentConfig, currentLogoImg, currentBorderLogoImg, activeSize, computedMazeDataRef.current);
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
              true,
              computedMazeDataRef.current
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
              true,
              computedMazeDataRef.current
            );
          }

          if (typeof globalThis.createImageBitmap === 'function') {
            createImageBitmap(vCanvas).then((imageBitmap) => {
              currentOnRendered({ moduleCount: modules.size, virtualImageBitmap: imageBitmap });
              if (vCanvas) {
                vCanvas.width = 0;
                vCanvas.height = 0;
              }
            }).catch((err) => {
              console.error("createImageBitmap failed in virtual render:", err);
              const imageData = vCtx.getImageData(0, 0, displayWidth, displayHeight);
              currentOnRendered({ moduleCount: modules.size, virtualImageData: imageData });
              if (vCanvas) {
                vCanvas.width = 0;
                vCanvas.height = 0;
              }
            });
          } else {
            const imageData = vCtx.getImageData(0, 0, displayWidth, displayHeight);
            currentOnRendered({ moduleCount: modules.size, virtualImageData: imageData });
            if (vCanvas) {
              vCanvas.width = 0;
              vCanvas.height = 0;
            }
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
  }, [requestMazeCalculation]);

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
          let val = currentConfig.value;
          if (currentConfig.type === QRType.URL && shouldNormalizeUrl(val)) {
            val = normalizeUrl(val);
          }
          const data = QRCode.create(val, {
            errorCorrectionLevel: currentConfig.errorCorrectionLevel,
          });
          const modules: QRModules = data.modules;
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
            let val = currentConfig.value;
            if (currentConfig.type === QRType.URL && shouldNormalizeUrl(val)) {
              val = normalizeUrl(val);
            }
            const data = QRCode.create(val, {
              errorCorrectionLevel: currentConfig.errorCorrectionLevel,
            });
            const modules: QRModules = data.modules;
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
  }, [config.value, config.errorCorrectionLevel, activeIsAnimating, requestMatrixCalculation]);

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
    activeConfig.isMazeEnabled,
    activeConfig.isMazeBridgesEnabled,
    activeConfig.mazeColor,
    activeConfig.mazePathWidth,
    activeConfig.showMazeSolution,
    computedMazeData,
    logoImg,
    borderLogoImg,
    size,
    activeIsAnimating,
    paintMatrix,
    requestMatrixCalculation,
  ]);

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
        className={`block h-auto w-full ${aspectRatioClass}`}
        role="img"
        aria-label={ariaLabel}
      />
    </div>
  );
});

export default React.memo(QRCanvas);
