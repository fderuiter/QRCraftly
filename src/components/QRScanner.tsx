import React, { useState, useEffect, useRef } from 'react';
import { Camera, Upload, AlertTriangle, X, RefreshCw, FileImage } from 'lucide-react';
import { useCamera } from '../hooks/useCamera';
import { useAdaptiveScanner } from '../hooks/useAdaptiveScanner';
import { Button } from './ui/Button';
import { fetchWasmAsset } from '../utils/assetCache';
import jsQR from 'jsqr';

/**
 * QRScannerProps definition.
 */
export interface QRScannerProps {
  /** Callback triggered when a QR code is successfully decoded from either stream or file. */
  onScanSuccess: (data: string) => void;
  /** Optional callback to close or dismiss the scanner UI. */
  onClose?: () => void;
  /** Optional flag to allow continuous scanning without stopping the camera stream. */
  continuous?: boolean;
}

/**
 * QRScanner Component that provides a dual-mode scanning interface inside the InputPanel.
 * It coordinates webcam streaming with local frame-based decoding, handles camera denial,
 * and provides a secure, completely client-side local file upload/drop fallback.
 * @param props - Component properties.
 * @param props.onScanSuccess - Callback for decoded value.
 * @param props.onClose - Dismiss scanner callback.
 * @param props.continuous - Enable continuous scanning.
 * @returns React functional component.
 */
export const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onClose, continuous = false }) => {
  const {
    permissionState,
    isInitializing,
    startStream,
    stopStream,
  } = useCamera();

  const [mode, setMode] = useState<'webcam' | 'file'>('webcam');
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileProcessing, setFileProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize Adaptive Scanner hook
  const { startScanning, stopScanning } = useAdaptiveScanner({
    videoRef,
    onScanSuccess: (data) => {
      onScanSuccess(data);
      if (!continuous) {
        stopStream();
        stopScanning();
      }
    },
    onScanFail: () => {
      // Background scan frame decode failure, normal and expected
    },
  });

  // Safe play helper to handle play promise in all environments
  const safePlay = (video: HTMLVideoElement) => {
    if (typeof video.play !== 'function') return;
    const playPromise = video.play();
    if (playPromise !== undefined && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        // Safe catch for play interruption
      });
    }
  };

  // Start webcam stream when in webcam mode
  useEffect(() => {
    const controller = new AbortController();

    if (mode === 'webcam') {
      startStream(controller.signal).then((activeStream) => {
        if (activeStream && videoRef.current) {
          videoRef.current.srcObject = activeStream;
          safePlay(videoRef.current);
          startScanning();
        }
      });
    } else {
      stopStream();
      stopScanning();
    }

    return () => {
      controller.abort();
      stopStream();
      stopScanning();
    };
  }, [mode, startStream, stopStream, startScanning, stopScanning]);

  // Handle manual retry for camera permission/access
  const handleRetryCamera = async () => {
    const activeStream = await startStream();
    if (activeStream && videoRef.current) {
      videoRef.current.srcObject = activeStream;
      safePlay(videoRef.current);
      startScanning();
    }
  };

  // Platform-specific instructions for resolving camera permission issues
  const getPlatformInstructions = (): string => {
    if (typeof navigator === 'undefined') {
      return 'Please enable camera access in your system settings.';
    }
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isAndroid = /Android/.test(ua);
    const isMac = /Macintosh|Mac OS X/.test(ua) && !isIOS;
    const isWindows = /Windows/.test(ua);

    if (isIOS) {
      return 'Open iOS Settings, go to your active Browser (e.g., Safari/Chrome), and ensure Camera access is set to "Allow".';
    }
    if (isAndroid) {
      return 'Open Android Settings, go to Apps > [Browser Name] > Permissions, and enable Camera access.';
    }
    if (isMac) {
      return 'Open macOS System Settings > Privacy & Security > Camera, and ensure your browser is allowed to access the camera.';
    }
    if (isWindows) {
      return 'Open Windows Settings > Privacy & Security > Camera, and toggle "Let apps access your camera" and your browser to ON.';
    }
    return 'Click the padlock or site control icon next to the URL in your browser\'s address bar, and allow Camera permissions.';
  };

  // Detect native browser support for the uploaded container type
  const isContainerSupportedNatively = (file: File): boolean => {
    if (typeof document === 'undefined') return false;
    const video = document.createElement('video');
    const type = file.type || (file.name.toLowerCase().endsWith('.mkv') ? 'video/x-matroska' : 'video/webm');
    const support = video.canPlayType(type);
    return support === 'probably' || support === 'maybe';
  };

  // Sequential native frame extraction using HTMLVideoElement
  const extractNativeFrames = (
    file: File,
    onFrame: (imageData: ImageData) => void
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        resolve();
        return;
      }
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      const url = URL.createObjectURL(file);
      // Validate that the created object URL is a safe local blob reference to prevent any potential DOM-XSS/HTML injection warnings (CodeQL)
      if (!url || !url.startsWith('blob:') || !/^blob:[a-zA-Z0-9\-:\/\.]+$/.test(url)) {
        reject(new Error('Unsafe video URL pattern detected'));
        return;
      }
      video.src = url;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const cleanUp = () => {
        video.pause();
        video.removeAttribute('src');
        video.load();
        URL.revokeObjectURL(url);
      };

      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;

        if (!ctx) {
          cleanUp();
          reject(new Error('Failed to create canvas context'));
          return;
        }

        const duration = video.duration || 0;
        if (duration === 0) {
          cleanUp();
          resolve();
          return;
        }

        const fps = 24; // Maintaining minimum 24 frames per second
        const step = 1 / fps;
        let currentTime = 0;

        const seekAndCapture = () => {
          if (currentTime > duration) {
            cleanUp();
            resolve();
            return;
          }
          video.currentTime = currentTime;
        };

        video.onseeked = () => {
          try {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            onFrame(imageData);
          } catch (e) {
            console.error('Error drawing native video frame:', e);
          }
          currentTime += step;
          seekAndCapture();
        };

        video.onerror = () => {
          cleanUp();
          reject(new Error('Failed to load video natively'));
        };

        seekAndCapture();
      };

      video.onerror = () => {
        cleanUp();
        reject(new Error('Failed to load video metadata'));
      };
    });
  };

  // Lazy-load WebAssembly demuxer and codec assets, and decode in worker
  const processVideoWithWasmDemuxer = async (file: File): Promise<void> => {
    // 1. Trigger on-demand network request for WebAssembly assets using authorized utility
    const wasmBuffer = await fetchWasmAsset('/webm-demuxer.wasm');

    // 2. Read video file to ArrayBuffer
    const fileBuffer = await file.arrayBuffer();

    // 3. Extract and scan frames inside a background worker
    return new Promise<void>((resolve, reject) => {
      const worker = new Worker(new URL('../utils/demuxerWorker.ts', import.meta.url), { type: 'module' });

      worker.onmessage = (event) => {
        const msg = event.data;
        if (msg.type === 'frame_decoded') {
          onScanSuccess(msg.data);
        } else if (msg.type === 'frame_pixels') {
          // Zero-copy transfer: feed extracted frame buffers into the scanning loop
          const { buffer, width, height } = msg;
          const u8Clamped = new Uint8ClampedArray(buffer);
          const code = jsQR(u8Clamped, width, height);
          if (code && code.data) {
            onScanSuccess(code.data);
          }
        } else if (msg.type === 'done') {
          worker.terminate();
          resolve();
        }
      };

      worker.onerror = (err) => {
        worker.terminate();
        reject(err);
      };

      // Feed buffers into worker using zero-copy transfers
      worker.postMessage({ fileBuffer, wasmBuffer }, [fileBuffer, wasmBuffer]);
    });
  };

  // Client-side QR decoding for video files
  const processVideoFile = async (file: File) => {
    setFileError(null);
    setFileProcessing(true);

    try {
      const isNative = isContainerSupportedNatively(file);
      if (isNative) {
        await extractNativeFrames(file, (imageData) => {
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            onScanSuccess(code.data);
          }
        });
      } else {
        await processVideoWithWasmDemuxer(file);
      }
    } catch (err: any) {
      setFileError(err.message || 'Failed to parse video file.');
    } finally {
      setFileProcessing(false);
    }
  };

  // Client-side QR decoding for local uploaded image files (Data Privacy)
  const processImageFile = async (file: File) => {
    setFileError(null);
    setFileProcessing(true);

    try {
      const decodedData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                reject(new Error('Failed to create canvas context.'));
                return;
              }
              ctx.drawImage(img, 0, 0);
              const imageData = ctx.getImageData(0, 0, img.width, img.height);
              const code = jsQR(imageData.data, imageData.width, imageData.height);
              if (code && code.data) {
                resolve(code.data);
              } else {
                reject(new Error('No QR code detected in this image. Try a clearer or higher-contrast QR code image.'));
              }
            } catch (err) {
              reject(err);
            }
          };
          img.onerror = () => {
            reject(new Error('Failed to load image file.'));
          };
          img.src = event.target?.result as string;
        };
        reader.onerror = () => {
          reject(new Error('Failed to read file.'));
        };
        reader.readAsDataURL(file);
      });

      onScanSuccess(decodedData);
    } catch (err: any) {
      setFileError(err.message || 'Failed to parse image file.');
    } finally {
      setFileProcessing(false);
    }
  };

  const processFile = async (file: File) => {
    const isVideo = file.name.toLowerCase().endsWith('.webm') || file.name.toLowerCase().endsWith('.mkv') || file.type.startsWith('video/');
    if (isVideo) {
      await processVideoFile(file);
    } else {
      await processImageFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const isVideo = file.name.toLowerCase().endsWith('.webm') || file.name.toLowerCase().endsWith('.mkv') || file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      if (isImage || isVideo) {
        processFile(file);
      } else {
        setFileError('Please drop an image or video file.');
      }
    }
  };

  const handleSelectFileClick = () => {
    fileInputRef.current?.click();
  };

  // Render webcam viewfinder state
  const renderWebcamViewfinder = () => {
    if (isInitializing) {
      return (
        <div className="flex flex-col items-center justify-center p-6 text-slate-500 dark:text-slate-400">
          <RefreshCw className="mb-3 size-8 animate-spin text-teal-600 dark:text-teal-400" />
          <p className="text-sm font-medium">Initializing camera stream...</p>
        </div>
      );
    }

    if (permissionState === 'denied' || permissionState === 'unavailable') {
      return (
        <div className="flex size-full flex-col justify-between p-5 text-center text-slate-800 dark:text-slate-200">
          <div className="flex flex-col items-center gap-3">
            <AlertTriangle className="size-10 text-amber-500" />
            <h3 className="text-base font-bold">
              {permissionState === 'denied' ? 'Camera Access Denied' : 'Camera Unavailable'}
            </h3>
            <p className="max-w-sm text-xs text-slate-500 dark:text-slate-400">
              {getPlatformInstructions()}
            </p>
          </div>
          <div className="mx-auto mt-4 flex w-full max-w-sm flex-col gap-2">
            {permissionState === 'denied' && (
              <Button variant="outline" size="sm" onClick={handleRetryCamera} fullWidth>
                <RefreshCw className="mr-1.5 size-3.5" />
                Retry Permission
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={() => setMode('file')} fullWidth>
              <Upload className="mr-1.5 size-3.5" />
              Switch to File Mode
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="relative size-full bg-black">
        {/* Live video feed */}
        <video
          ref={videoRef}
          className="size-full object-cover"
          playsInline
          muted
          aria-label="Webcam feed"
        />
        {/* Scanning targeting guide overlay */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center border-[3px] border-teal-500/40">
          <div className="relative flex size-48 animate-pulse items-center justify-center rounded-lg border-2 border-teal-400">
            {/* Guide line animation */}
            <div className="absolute inset-x-0 h-0.5 animate-[bounce_2s_infinite] bg-teal-400 shadow-[0_0_8px_#2dd4bf]" />
          </div>
        </div>
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
          Align QR code inside frame
        </div>
      </div>
    );
  };

  // Render file dropzone viewfinder state
  const renderFileViewfinder = () => {
    return (
      <button
        type="button"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleSelectFileClick}
        className={`flex size-full flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors focus:ring-2 focus:ring-teal-500 focus:outline-none ${
          dragOver
            ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/20'
            : 'border-slate-300 bg-transparent hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-600'
        }`}
      >
        <input
          type="file"
          accept="image/*, .webm, .mkv, video/webm, video/x-matroska"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
          aria-label="Upload QR code image or video file"
        />

        {fileProcessing ? (
          <div className="flex flex-col items-center">
            <RefreshCw className="mb-3 size-8 animate-spin text-teal-600 dark:text-teal-400" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Processing file...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <FileImage className="mb-3 size-10 text-slate-400" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Drag & Drop QR Image or Video
            </p>
            <p className="mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">
              or click here to select a file from your device.
            </p>
          </div>
        )}

        {fileError && (
          <div className="mt-4 flex max-w-xs items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">
            <AlertTriangle className="size-4 shrink-0" />
            <span>{fileError}</span>
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Scanner Mode Selector Header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex gap-1.5 rounded-lg bg-slate-200/60 p-0.5 text-xs font-semibold dark:bg-slate-800">
          <button
            type="button"
            onClick={() => {
              setMode('webcam');
              setFileError(null);
            }}
            className={`rounded-md px-3 py-1.5 transition-all ${
              mode === 'webcam'
                ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Camera className="mr-1 inline size-3.5" />
            Webcam
          </button>
          <button
            type="button"
            onClick={() => setMode('file')}
            className={`rounded-md px-3 py-1.5 transition-all ${
              mode === 'file'
                ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Upload className="mr-1 inline size-3.5" />
            File Upload
          </button>
        </div>

        {onClose && (
          <Button variant="icon" size="icon" onClick={onClose} aria-label="Close scanner" className="size-8 rounded-full">
            <X className="size-4" />
          </Button>
        )}
      </div>

      {/* Viewfinder Area (Layout Stability) */}
      <div className="relative flex aspect-video max-h-[350px] min-h-65 w-full items-center justify-center bg-slate-100 md:aspect-[4/3] dark:bg-slate-950/40">
        {mode === 'webcam' ? renderWebcamViewfinder() : renderFileViewfinder()}
      </div>
    </div>
  );
};
