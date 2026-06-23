import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { QRConfig } from '../types';
import { useQRStore } from '@/context/QRContext';
import { ValidationEngine } from '../engine/ValidationEngine';
import { useCapabilities } from './useCapabilities';

export type ScannabilityStatus = 'idle' | 'checking' | 'digital-pass' | 'physical-pass' | 'fail';

export interface HealthScore {
  score: number;
  warnings: string[];
}

export function useScannability(canvasRef: React.RefObject<HTMLCanvasElement | null>, config: QRConfig) {
  const [status, setStatus] = useState<ScannabilityStatus>('idle');
  const workerRef = useRef<Worker | null>(null);
  const store = useQRStore();
  const { engine } = useCapabilities();

  const health = useMemo<HealthScore>(() => {
    return ValidationEngine.calculateScannability(config);
  }, [config]);

  useEffect(() => {
    // Initialize worker
    let worker = workerRef.current;
    if (typeof window !== 'undefined' && !worker) {
      worker = new Worker(new URL('../utils/scannabilityWorker.ts', import.meta.url), { type: 'module' });
      workerRef.current = worker;
    }
    
    if (!worker) return;

    const handleMessage = (e: MessageEvent) => {
      const { success, physicalReady, error } = e.data;
      setStatus(success ? (physicalReady ? 'physical-pass' : 'digital-pass') : 'fail');

      if (!success && error) {
        store.emitSignal('scannability-fail', {
          engine,
          styleId: config.style || 'default',
          errorType: error
        });
      }
    };

    worker.addEventListener('message', handleMessage);

    return () => {
      worker.removeEventListener('message', handleMessage);
      // We don't terminate the worker here because it's stored in a ref and reused across config changes,
      // but if the component unmounts fully, we should ideally clean it up.
      // However, React 18 StrictMode double-invokes useEffect, which would kill our worker.
      // We will leave it alive or manage its lifecycle better.
    };
  }, [config, store, engine]);

  // Handle worker cleanup on full unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

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
      }, [overrideImageData.data.buffer]);
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
        }, [imageData.data.buffer]);
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
