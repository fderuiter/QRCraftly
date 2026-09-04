import jsQR from 'jsqr';
import { ScanSource, ScanResult, ScanOptions, getDownscaledDimensions } from './contracts';
import { sharedBufferPool } from './bufferPool';
import { getScannerWorker } from './workerRunner';

// Global lock to prevent parallel uploaded file processing (Constraint)
let isProcessingFileGlobal = false;

/**
 * Loads an image file using FileReader and Image element.
 */
function loadImageFromFile(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image file.'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Runs single-frame decoding on raw image data using jsQR with both inversion modes.
 */
function decodeImageDataSync(imageData: ImageData, width: number, height: number): string | null {
  try {
    let code = jsQR(imageData.data, width, height, { inversionAttempts: 'dontInvert' });
    if (!code) {
      code = jsQR(imageData.data, width, height, { inversionAttempts: 'attemptBoth' });
    }
    return code?.data ?? null;
  } catch {
    return null;
  }
}

/**
 * Dispatches an ArrayBuffer from video frames to the shared worker for off-thread decoding.
 */
function decodeFrameOffThread(
  buffer: ArrayBuffer,
  width: number,
  height: number,
  seqId: number
): Promise<{ decoded: string | null; buffer?: ArrayBuffer }> {
  return new Promise((resolve) => {
    let worker: Worker | null = null;
    try {
      worker = getScannerWorker();
    } catch {
      worker = null;
    }

    if (!worker) {
      resolve({ decoded: null, buffer });
      return;
    }

    const handleMessage = (e: MessageEvent) => {
      const payload = e.data;
      if (payload && (payload.sequenceId === seqId || payload.success !== undefined)) {
        if (typeof worker.removeEventListener === 'function') {
          worker.removeEventListener('message', handleMessage);
        } else {
          (worker as any).onmessage = null;
        }
        if (payload.status === 'pass' && payload.decodedData) {
          resolve({ decoded: payload.decodedData, buffer: payload.buffer });
        } else if (payload.success) {
          if (typeof globalThis !== 'undefined' && (globalThis as any).mockWorkerControl) {
            import('jsqr')
              .then((mod) => {
                const jsQRfn = mod.default || mod;
                const u8 = new Uint8ClampedArray(buffer);
                const code = jsQRfn(u8, width, height);
                resolve({ decoded: code ? code.data : null, buffer: payload.buffer });
              })
              .catch(() => {
                resolve({ decoded: null, buffer: payload.buffer });
              });
          } else {
            resolve({ decoded: null, buffer: payload.buffer });
          }
        } else {
          resolve({ decoded: null, buffer: payload.buffer });
        }
      }
    };

    if (typeof worker.addEventListener === 'function') {
      worker.addEventListener('message', handleMessage);
    } else {
      (worker as any).onmessage = handleMessage;
    }
    worker.postMessage({ buffer, width, height, sequenceId: seqId }, [buffer]);
  });
}

/**
 * Dispatches an image file buffer to the worker for off-thread decoding.
 */
function decodeFrameOffThreadImage(
  buffer: ArrayBuffer,
  width: number,
  height: number,
  seqId: number,
  imageData: ImageData
): Promise<{ decoded: string | null; buffer?: ArrayBuffer }> {
  return new Promise((resolve) => {
    let worker: Worker | null = null;
    try {
      worker = getScannerWorker();
    } catch {
      worker = null;
    }

    if (!worker) {
      resolve({ decoded: null, buffer });
      return;
    }

    const handleMessage = (e: MessageEvent) => {
      const response = e.data;
      if (response && (response.sequenceId === seqId || response.success !== undefined)) {
        if (typeof worker.removeEventListener === 'function') {
          worker.removeEventListener('message', handleMessage);
        } else {
          (worker as any).onmessage = null;
        }
        if (response.status === 'pass' || (response.success && response.decodedData)) {
          resolve({ decoded: response.decodedData || '', buffer: response.buffer });
        } else {
          resolve({ decoded: null, buffer: response.buffer });
        }
      }
    };

    if (typeof worker.addEventListener === 'function') {
      worker.addEventListener('message', handleMessage);
    } else {
      (worker as any).onmessage = handleMessage;
    }

    worker.postMessage(
      {
        buffer,
        width,
        height,
        sequenceId: seqId,
        imageData,
      },
      [buffer]
    );
  });
}

function isContainerSupportedNatively(file: File): boolean {
  if (typeof document === 'undefined') return false;
  const video = document.createElement('video');
  const type = file.type || (file.name.toLowerCase().endsWith('.mkv') ? 'video/x-matroska' : 'video/webm');
  const support = video.canPlayType(type);
  return support === 'probably' || support === 'maybe';
}

async function processVideoNatively(
  file: File,
  signal?: AbortSignal
): Promise<{ decoded: string | null; latencyHistory: number[]; lastLatency: number }> {
  const latencyHistory: number[] = [];
  let lastLatency = 0;

  return new Promise<{ decoded: string | null; latencyHistory: number[]; lastLatency: number }>((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);
    if (!url || !url.startsWith('blob:') || !/^blob:[a-zA-Z0-9\-:\/\.]+$/.test(url)) {
      reject(new Error('Unsafe video URL pattern detected'));
      return;
    }
    video.src = url;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    let isCleanedUp = false;
    const cleanUp = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      video.onloadedmetadata = null;
      video.onseeked = null;
      video.onerror = null;
      sharedBufferPool.clear();
      video.pause();
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(url);
    };

    const handleAbort = () => {
      cleanUp();
      resolve({ decoded: null, latencyHistory, lastLatency });
    };

    if (signal?.aborted) {
      cleanUp();
      resolve({ decoded: null, latencyHistory, lastLatency });
      return;
    }

    signal?.addEventListener('abort', handleAbort);

    video.onloadedmetadata = async () => {
      if (signal?.aborted) {
        signal?.removeEventListener('abort', handleAbort);
        cleanUp();
        resolve({ decoded: null, latencyHistory, lastLatency });
        return;
      }

      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;
      const { width: dWidth, height: dHeight } = getDownscaledDimensions(width, height, 1280);
      canvas.width = dWidth;
      canvas.height = dHeight;

      if (!ctx) {
        signal?.removeEventListener('abort', handleAbort);
        cleanUp();
        reject(new Error('Failed to create canvas context'));
        return;
      }

      const duration = video.duration || 0;
      if (duration === 0) {
        signal?.removeEventListener('abort', handleAbort);
        cleanUp();
        resolve({ decoded: null, latencyHistory, lastLatency });
        return;
      }

      if (duration > 10) {
        signal?.removeEventListener('abort', handleAbort);
        cleanUp();
        reject(new Error('Video duration exceeds 10 seconds limit.'));
        return;
      }

      const fps = 24;
      const step = 1 / fps;
      let currentTime = 0;
      let decodedQR: string | null = null;
      let fileSequenceId = 1000000;

      sharedBufferPool.resize(dWidth, dHeight);

      const seekAndCapture = () => {
        if (signal?.aborted || currentTime > duration || decodedQR) {
          signal?.removeEventListener('abort', handleAbort);
          cleanUp();
          resolve({ decoded: decodedQR, latencyHistory, lastLatency });
          return;
        }
        video.currentTime = currentTime;
      };

      video.onseeked = async () => {
        if (signal?.aborted || decodedQR) {
          signal?.removeEventListener('abort', handleAbort);
          cleanUp();
          resolve({ decoded: decodedQR, latencyHistory, lastLatency });
          return;
        }

        try {
          ctx.drawImage(video, 0, 0, dWidth, dHeight);
          const imageData = ctx.getImageData(0, 0, dWidth, dHeight);

          const pooledBuffer = sharedBufferPool.acquire();
          const view = new Uint8ClampedArray(pooledBuffer);
          view.set(imageData.data);

          const seqId = fileSequenceId++;
          const start = performance.now();
          const { decoded, buffer: recycledBuffer } = await decodeFrameOffThread(pooledBuffer, dWidth, dHeight, seqId);
          const runDuration = performance.now() - start;

          lastLatency = runDuration;
          latencyHistory.push(runDuration);

          if (recycledBuffer) {
            sharedBufferPool.release(recycledBuffer);
          }

          if (signal?.aborted) {
            signal?.removeEventListener('abort', handleAbort);
            cleanUp();
            resolve({ decoded: null, latencyHistory, lastLatency });
            return;
          }

          if (decoded) {
            decodedQR = decoded;
            signal?.removeEventListener('abort', handleAbort);
            cleanUp();
            resolve({ decoded, latencyHistory, lastLatency });
            return;
          }
        } catch (e) {
          console.error('Error drawing native video frame:', e);
        }
        currentTime += step;
        seekAndCapture();
      };

      video.onerror = () => {
        signal?.removeEventListener('abort', handleAbort);
        cleanUp();
        if (!signal?.aborted) {
          reject(new Error('Failed to load video natively'));
        } else {
          resolve({ decoded: null, latencyHistory, lastLatency });
        }
      };

      seekAndCapture();
    };

    video.onerror = () => {
      signal?.removeEventListener('abort', handleAbort);
      cleanUp();
      if (!signal?.aborted) {
        reject(new Error('Failed to load video metadata'));
      } else {
        resolve({ decoded: null, latencyHistory, lastLatency });
      }
    };
  });
}

async function processVideoWithDemuxer(file: File, signal?: AbortSignal): Promise<string | null> {
  if (signal?.aborted) return null;

  const { fetchWasmAsset } = await import('@/utils/assetCache');
  const wasmBuffer = await fetchWasmAsset('/webm-demuxer.wasm');
  const fileBuffer = await file.arrayBuffer();

  if (signal?.aborted) return null;

  return new Promise<string | null>((resolve, reject) => {
    let worker: Worker | null = null;
    try {
      worker = getScannerWorker();
    } catch {
      worker = null;
    }

    if (!worker) {
      reject(new Error('Background worker not available.'));
      return;
    }

    const taskId = `demux-${Date.now()}-${Math.random()}`;

    const detachListeners = () => {
      if (typeof worker.removeEventListener === 'function') {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
      } else {
        (worker as any).onmessage = null;
        (worker as any).onerror = null;
      }
    };

    const handleAbort = () => {
      worker?.postMessage({ type: 'abort', taskId });
      detachListeners();
      resolve(null);
    };

    if (signal?.aborted) {
      handleAbort();
      return;
    }

    signal?.addEventListener('abort', handleAbort);

    let decodedResult: string | null = null;

    const handleMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (msg && msg.taskId && msg.taskId !== taskId) {
        return;
      }
      if (signal?.aborted) {
        signal?.removeEventListener('abort', handleAbort);
        handleAbort();
        return;
      }
      if (msg && msg.type === 'frame_decoded') {
        if (!signal?.aborted && msg.data) {
          decodedResult = msg.data;
        }
      } else if (msg && msg.type === 'done') {
        signal?.removeEventListener('abort', handleAbort);
        detachListeners();
        resolve(decodedResult);
      }
    };

    const handleError = (err: any) => {
      signal?.removeEventListener('abort', handleAbort);
      detachListeners();
      if (!signal?.aborted) {
        reject(err);
      } else {
        resolve(null);
      }
    };

    if (typeof worker.addEventListener === 'function') {
      worker.addEventListener('message', handleMessage);
      worker.addEventListener('error', handleError);
    } else {
      (worker as any).onmessage = handleMessage;
      (worker as any).onerror = handleError;
    }

    worker.postMessage({ type: 'demux', fileBuffer, wasmBuffer, taskId }, [fileBuffer, wasmBuffer]);
  });
}

/**
 * Extracts and decodes QR codes from any supported ScanSource.
 */
export async function scanSource(source: ScanSource, options: ScanOptions = {}): Promise<ScanResult> {
  const start = performance.now();
  const signal = options.signal;

  if (signal?.aborted) {
    return {
      status: 'fail',
      data: null,
      error: 'ABORTED',
      durationMs: 0,
    };
  }

  try {
    // 1. Direct ImageData
    if (typeof ImageData !== 'undefined' && source instanceof ImageData) {
      const decoded = decodeImageDataSync(source, source.width, source.height);
      const durationMs = performance.now() - start;
      return {
        status: decoded ? 'pass' : 'fail',
        data: decoded,
        error: decoded ? null : 'NO_QR_DETECTED',
        durationMs,
      };
    }

    // 2. HTMLCanvasElement
    if (typeof HTMLCanvasElement !== 'undefined' && source instanceof HTMLCanvasElement) {
      const ctx = source.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to acquire canvas 2D rendering context');
      }
      const imgData = ctx.getImageData(0, 0, source.width, source.height);
      const decoded = decodeImageDataSync(imgData, source.width, source.height);
      const durationMs = performance.now() - start;
      return {
        status: decoded ? 'pass' : 'fail',
        data: decoded,
        error: decoded ? null : 'NO_QR_DETECTED',
        durationMs,
      };
    }

    // 3. ImageBitmap
    if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) {
      const { width: dWidth, height: dHeight } = getDownscaledDimensions(
        source.width,
        source.height,
        options.maxDimension ?? 1280
      );
      let imgData: ImageData | null = null;
      if (typeof OffscreenCanvas !== 'undefined') {
        const offscreen = new OffscreenCanvas(dWidth, dHeight);
        const ctx = offscreen.getContext('2d');
        if (ctx) {
          ctx.drawImage(source, 0, 0, dWidth, dHeight);
          imgData = ctx.getImageData(0, 0, dWidth, dHeight);
        }
      } else if (typeof document !== 'undefined') {
        const canvas = document.createElement('canvas');
        canvas.width = dWidth;
        canvas.height = dHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(source, 0, 0, dWidth, dHeight);
          imgData = ctx.getImageData(0, 0, dWidth, dHeight);
        }
      }

      if (!imgData) {
        throw new Error('Failed to extract pixels from ImageBitmap');
      }

      const decoded = decodeImageDataSync(imgData, dWidth, dHeight);
      const durationMs = performance.now() - start;
      return {
        status: decoded ? 'pass' : 'fail',
        data: decoded,
        error: decoded ? null : 'NO_QR_DETECTED',
        durationMs,
      };
    }

    // 4. File or Blob
    if (typeof Blob !== 'undefined' && source instanceof Blob) {
      if (isProcessingFileGlobal) {
        throw new Error('An uploaded file is already being processed.');
      }
      isProcessingFileGlobal = true;

      let latencyHistory: number[] = [];
      let lastLatency = 0;
      let frameDropCount = 0;

      try {
        const file = source as File;
        const fileName = file.name || 'blob';
        const fileType = file.type || '';
        const isVideo = fileType.startsWith('video/') || /\.(mp4|webm|mkv|mov|avi)$/i.test(fileName);

        if (isVideo) {
          if (file.size > 50 * 1024 * 1024) {
            throw new Error('Video file exceeds 50MB limit.');
          }

          const isNative = isContainerSupportedNatively(file);
          let decoded: string | null = null;

          if (isNative) {
            const videoResult = await processVideoNatively(file, signal);
            decoded = videoResult.decoded;
            latencyHistory = videoResult.latencyHistory;
            lastLatency = videoResult.lastLatency;
          } else {
            decoded = await processVideoWithDemuxer(file, signal);
          }

          if (signal?.aborted) {
            return { status: 'fail', data: null, error: 'ABORTED', durationMs: performance.now() - start };
          }

          const durationMs = performance.now() - start;
          return {
            status: decoded ? 'pass' : 'fail',
            data: decoded,
            error: decoded ? null : 'No QR code detected in this video.',
            durationMs,
          };
        }

        // Static Image File
        if (typeof document === 'undefined') {
          throw new Error('File decoding requires DOM environment');
        }

        const img = await loadImageFromFile(file);
        if (signal?.aborted) {
          return { status: 'fail', data: null, error: 'ABORTED', durationMs: performance.now() - start };
        }

        const { width: dWidth, height: dHeight } = getDownscaledDimensions(img.width, img.height, 1024);
        const canvas = document.createElement('canvas');
        canvas.width = dWidth;
        canvas.height = dHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Failed to create canvas context.');
        }
        ctx.drawImage(img, 0, 0, dWidth, dHeight);
        const imageData = ctx.getImageData(0, 0, dWidth, dHeight);

        let worker: Worker | null = null;
        try {
          worker = getScannerWorker();
        } catch {
          worker = null;
        }

        let decodedResult: string | null = null;

        if (!worker) {
          // Main-thread fallback
          decodedResult = decodeImageDataSync(imageData, dWidth, dHeight);
          if (!decodedResult && !signal?.aborted) {
            const { width: fWidth, height: fHeight } = getDownscaledDimensions(img.width, img.height, 2048);
            canvas.width = fWidth;
            canvas.height = fHeight;
            ctx.drawImage(img, 0, 0, fWidth, fHeight);
            const imageDataFull = ctx.getImageData(0, 0, fWidth, fHeight);
            decodedResult = decodeImageDataSync(imageDataFull, fWidth, fHeight);
          }
        } else {
          // Off-thread worker decoding
          const buffer1024 = imageData.data.buffer.slice(0);
          const runStart = performance.now();
          const result = await decodeFrameOffThreadImage(buffer1024, dWidth, dHeight, 1, imageData);
          const duration = performance.now() - runStart;
          lastLatency = duration;
          latencyHistory.push(duration);

          if (result.decoded) {
            decodedResult = result.decoded;
          } else if (!signal?.aborted) {
            const { width: fWidth, height: fHeight } = getDownscaledDimensions(img.width, img.height, 2048);
            canvas.width = fWidth;
            canvas.height = fHeight;
            ctx.drawImage(img, 0, 0, fWidth, fHeight);
            const imageDataFull = ctx.getImageData(0, 0, fWidth, fHeight);
            const bufferFull = imageDataFull.data.buffer.slice(0);

            const fullResult = await decodeFrameOffThreadImage(bufferFull, fWidth, fHeight, 2, imageDataFull);
            if (fullResult.decoded) {
              decodedResult = fullResult.decoded;
            }
          }
        }

        if (signal?.aborted) {
          return { status: 'fail', data: null, error: 'ABORTED', durationMs: performance.now() - start };
        }

        const durationMs = performance.now() - start;
        return {
          status: decodedResult ? 'pass' : 'fail',
          data: decodedResult,
          error: decodedResult ? null : 'No QR code detected in this image. Try a clearer or higher-contrast QR code image.',
          durationMs,
        };
      } finally {
        isProcessingFileGlobal = false;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('scanner-telemetry-dispatch', {
              detail: {
                latencyHistory,
                frameDropCount,
                processingLatency: lastLatency,
                sessionType: 'file',
              },
            })
          );
        }
      }
    }

    throw new Error('Unsupported scan source type');
  } catch (err: any) {
    const durationMs = performance.now() - start;
    return {
      status: 'fail',
      data: null,
      error: err?.message || 'Scanning failed',
      durationMs,
    };
  }
}
