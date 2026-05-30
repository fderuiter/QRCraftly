import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { QRConfig } from '../types';
import { useQRContext } from '@/context/QRContext';
import { getContrastRatio } from '../utils/colorUtils';

export type ScannabilityStatus = 'idle' | 'checking' | 'pass' | 'fail';

export interface HealthScore {
  score: number;
  warnings: string[];
}

export function useScannability(canvasRef: React.RefObject<HTMLCanvasElement | null>, config: QRConfig) {
  const [status, setStatus] = useState<ScannabilityStatus>('idle');
  const workerRef = useRef<Worker | null>(null);
  const timeoutRef = useRef<any>(null);
  const { emitSignal } = useQRContext();

  const health = useMemo<HealthScore>(() => {
    let score = 100;
    const warnings: string[] = [];

    const fgContrast = getContrastRatio(config.fgColor, config.bgColor);
    const eyeContrast = getContrastRatio(config.eyeColor, config.bgColor);
    const worstContrast = Math.min(fgContrast, eyeContrast);

    if (worstContrast < 3.0) {
      score -= 40;
      warnings.push("Contrast ratio is critically low");
    } else if (worstContrast < 4.5) {
      score -= 20;
      warnings.push("Contrast ratio is low");
    }

    const isComplex = ['grunge', 'circuit', 'starburst'].includes(config.style);
    if (isComplex) {
      score -= 10;
      if (worstContrast < 7.0) {
        score -= 20;
        warnings.push("Pattern complexity too high for current contrast");
      }
    }

    if (config.logoUrl) {
      if (config.logoSize > 0.3) {
        score -= 15;
        warnings.push("Logo size might obscure too much data");
      }
      if (config.errorCorrectionLevel === 'L') {
        score -= 15;
        warnings.push("Low error correction with logo");
      }
    }

    return { score: Math.max(0, Math.min(100, score)), warnings };
  }, [config]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Expose a function to trigger check
  const checkScannability = useCallback((coords?: { x: number; y: number; width: number; height: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Strict Lifecycle Management: Terminate active worker to prevent race conditions and CPU thrashing
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }

    setStatus('checking');
    
    // Use requestIdleCallback or setTimeout to read canvas data without blocking
    const readAndSend = () => {
      try {
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setStatus('fail');
          return;
        }
        
        // Make sure canvas actually has dimensions
        if (canvas.width === 0 || canvas.height === 0) {
          setStatus('idle');
          return;
        }

        let scanX = 0;
        let scanY = 0;
        let scanW = canvas.width;
        let scanH = canvas.height;

        // Regional Image Extraction: use targeted coordinates if provided
        if (coords) {
          scanX = Math.floor(coords.x);
          scanY = Math.floor(coords.y);
          scanW = Math.floor(coords.width);
          scanH = Math.floor(coords.height);
          
          scanX = Math.max(0, scanX);
          scanY = Math.max(0, scanY);
          scanW = Math.min(canvas.width - scanX, scanW);
          scanH = Math.min(canvas.height - scanY, scanH);
        }

        if (scanW <= 0 || scanH <= 0) {
          setStatus('fail');
          return;
        }

        const worker = new Worker(new URL('../utils/scannabilityWorker.ts', import.meta.url), { type: 'module' });
        workerRef.current = worker;

        const handleMessage = (e: MessageEvent) => {
          const { success, error } = e.data;
          setStatus(success ? 'pass' : 'fail');

          if (!success && error) {
            emitSignal('scannability-fail', {
              engine: navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome') ? 'WebKit' : 
                      navigator.userAgent.includes('Firefox') ? 'Firefox' : 'Chromium',
              styleId: config.style || 'default',
              errorType: error
            });
          }
          
          // Clean up worker after check completes to free memory
          worker.terminate();
          workerRef.current = null;
        };

        worker.addEventListener('message', handleMessage);

        const imageData = ctx.getImageData(scanX, scanY, scanW, scanH);
        worker.postMessage({
          imageData,
          width: scanW,
          height: scanH,
        });
      } catch (err) {
        console.error("Failed to read canvas data", err);
        setStatus('fail');
      }
    };

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(readAndSend);
    } else {
      timeoutRef.current = setTimeout(readAndSend, 100);
    }
  }, [config.style, emitSignal]);

  return { status, checkScannability, health };
}
