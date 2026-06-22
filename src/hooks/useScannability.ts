import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { QRConfig } from '../types';
import { useQRStore } from '@/context/QRContext';
import { ValidationEngine } from '../engine/ValidationEngine';

export type ScannabilityStatus = 'idle' | 'checking' | 'digital-pass' | 'physical-pass' | 'fail';

export interface HealthScore {
  score: number;
  warnings: string[];
}

export function useScannability(canvasRef: React.RefObject<HTMLCanvasElement | null>, config: QRConfig) {
  const [status, setStatus] = useState<ScannabilityStatus>('idle');
  const workerRef = useRef<Worker | null>(null);
  const store = useQRStore();

  const health = useMemo<HealthScore>(() => {
    return ValidationEngine.calculateScannability(config);
  }, [config]);

  useEffect(() => {
    // Initialize worker
    if (typeof window !== 'undefined' && !workerRef.current) {
      workerRef.current = new Worker(new URL('../utils/scannabilityWorker.ts', import.meta.url), { type: 'module' });
    }
    
    const worker = workerRef.current;
    if (!worker) return;

    const handleMessage = (e: MessageEvent) => {
      const { success, physicalReady, error } = e.data;
      setStatus(success ? (physicalReady ? 'physical-pass' : 'digital-pass') : 'fail');

      if (!success && error) {
        store.emitSignal('scannability-fail', {
          engine: navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome') ? 'WebKit' : 
                  navigator.userAgent.includes('Firefox') ? 'Firefox' : 'Chromium',
          styleId: config.style || 'default',
          errorType: error
        });
      }
    };

    worker.addEventListener('message', handleMessage);

    return () => {
      worker.removeEventListener('message', handleMessage);
    };
  }, [config, store]);

  // Expose a function to trigger check
  const checkScannability = useCallback((overrideImageData?: ImageData) => {
    const worker = workerRef.current;
    if (!worker) return;

    setStatus('checking');
    
    // If virtual renderer provided deterministic image data, use it directly
    if (overrideImageData) {
      worker.postMessage({
        imageData: overrideImageData,
        width: overrideImageData.width,
        height: overrideImageData.height,
        isTest: navigator.webdriver,
      });
      return;
    }

    // Fallback: Use requestIdleCallback or setTimeout to read canvas data without blocking
    const readAndSend = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        setStatus('idle');
        return;
      }
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

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        worker.postMessage({
          imageData,
          width: canvas.width,
          height: canvas.height,
          isTest: navigator.webdriver,
        });
      } catch (err) {
        console.error("Failed to read canvas data", err);
        setStatus('fail');
      }
    };

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(readAndSend);
    } else {
      setTimeout(readAndSend, 100);
    }
  }, [canvasRef]);

  return { status, checkScannability, health };
}
