import { useEffect, useState, useRef } from 'react';
import { QRConfig } from '../types';
import { useQRContext } from '@/context/QRContext';

export type ScannabilityStatus = 'idle' | 'checking' | 'pass' | 'fail';

export function useScannability(canvasRef: React.RefObject<HTMLCanvasElement | null>, config: QRConfig) {
  const [status, setStatus] = useState<ScannabilityStatus>('idle');
  const workerRef = useRef<Worker | null>(null);
  const { emitSignal } = useQRContext();

  useEffect(() => {
    // Initialize worker
    if (typeof window !== 'undefined' && !workerRef.current) {
      workerRef.current = new Worker(new URL('../utils/scannabilityWorker.ts', import.meta.url), { type: 'module' });
    }
    
    const worker = workerRef.current;
    if (!worker) return;

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
    };

    worker.addEventListener('message', handleMessage);

    return () => {
      worker.removeEventListener('message', handleMessage);
    };
  }, [config, emitSignal]);

  // Expose a function to trigger check
  const checkScannability = () => {
    const canvas = canvasRef.current;
    const worker = workerRef.current;
    if (!canvas || !worker) return;

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

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        worker.postMessage({
          imageData,
          width: canvas.width,
          height: canvas.height,
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
  };

  return { status, checkScannability };
}
