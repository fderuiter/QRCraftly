import React, { useState, useEffect, useRef } from 'react';
import { Camera, Upload, AlertTriangle, X, RefreshCw, FileImage } from 'lucide-react';
import { useQrScanner } from '@/packages/optical-scanner/client';
import { Button } from './ui/Button';
import { EmptyState } from './ui/EmptyState';
import { SegmentedControl } from './ui/SegmentedControl';

/**
 * Error-like check that also accepts `DOMException`s, which are not `Error` instances in
 * every runtime (jsdom).
 */
const isErrorLike = (value: unknown): value is Error =>
  typeof value === 'object' && value !== null && 'name' in value && 'message' in value;

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
  const [mode, setMode] = useState<'webcam' | 'file'>('webcam');
  const [isWebcamActive, setIsWebcamActive] = useState<boolean>(true);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileProcessing, setFileProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fileAbortControllerRef = useRef<AbortController | null>(null);

  // The scan session owns the camera stream, the video element's source and the frame loop.
  const { state: camera, start, stop, videoRef, scanFile } = useQrScanner({
    onScanSuccess: (data) => {
      onScanSuccess(data);
      if (!continuous) {
        stop();
        setIsWebcamActive(false);
      }
    },
  });

  // Run the camera while the webcam tab is active. start() and stop() are idempotent, so this is
  // safe when React runs the effect twice (StrictMode) or remounts the scanner quickly.
  useEffect(() => {
    if (mode !== 'webcam' || !isWebcamActive) {
      stop();
      return undefined;
    }
    void start();
    return () => stop();
  }, [mode, isWebcamActive, start, stop]);

  // Cancel a file scan that is still running when the scanner closes.
  useEffect(() => {
    return () => {
      fileAbortControllerRef.current?.abort();
      fileAbortControllerRef.current = null;
    };
  }, []);

  // Handle manual retry for camera permission/access
  const handleRetryCamera = () => {
    setIsWebcamActive(true);
    void start();
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

  // Client-side QR decoding using the unified deep module scanFile method
  const processFile = async (file: File) => {
    if (fileAbortControllerRef.current) {
      fileAbortControllerRef.current.abort();
      fileAbortControllerRef.current = null;
    }

    const controller = new AbortController();
    fileAbortControllerRef.current = controller;

    setFileError(null);
    setFileProcessing(true);

    try {
      const result = await scanFile(file, { signal: controller.signal });
      if (controller.signal.aborted) return;
      if (result.status === 'pass' && result.data) {
        onScanSuccess(result.data);
      } else if (result.error) {
        setFileError(result.error);
      }
    } catch (err) {
      const isAbort = isErrorLike(err) && err.name === 'AbortError';
      if (!controller.signal.aborted && !isAbort) {
        setFileError((isErrorLike(err) && err.message) || 'Failed to parse file.');
      }
    } finally {
      if (fileAbortControllerRef.current === controller) {
        fileAbortControllerRef.current = null;
        setFileProcessing(false);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
      e.target.value = '';
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
      if (file.type.startsWith('image/')) {
        processFile(file);
      } else {
        setFileError('Please drop an image file.');
      }
    }
  };

  const handleSelectFileClick = () => {
    fileInputRef.current?.click();
  };

  // Render webcam viewfinder state
  const renderCameraProblem = () => {
    if (camera.status !== 'denied' && camera.status !== 'unavailable' && camera.status !== 'error') return null;
    const denied = camera.status === 'denied';
    // Lead with the way that works without a camera; permission help is secondary.
    return (
      <div className="absolute inset-0 flex flex-col gap-3 overflow-y-auto bg-surface p-4">
        <EmptyState
          illustration={<FileImage className="size-6" />}
          title={denied ? 'Camera Access Denied' : 'Camera Unavailable'}
          body="You can still scan a QR code from a photo or screenshot."
          action={
            <Button
              variant="primary"
              onClick={() => {
                setMode('file');
                setIsWebcamActive(false);
              }}
            >
              <Upload className="size-4" aria-hidden="true" />
              Scan from an image instead
            </Button>
          }
        />
        {denied && (
          <div className="flex flex-col items-center gap-2 text-center text-xs text-fg-muted">
            <p className="max-w-sm">To use the camera: {getPlatformInstructions()}</p>
            <Button variant="ghost" size="sm" onClick={handleRetryCamera}>
              <RefreshCw className="size-3.5" aria-hidden="true" />
              Retry Permission
            </Button>
          </div>
        )}
      </div>
    );
  };

  // Render webcam viewfinder state. The video element stays mounted so the session always has an
  // element to attach the camera to, including after a retried permission request.
  const renderWebcamViewfinder = () => {
    return (
      <div className="relative size-full bg-black">
        {/* Live video feed */}
        <video
          ref={videoRef}
          className="size-full object-cover"
          autoPlay
          playsInline
          muted
          aria-label="Webcam feed"
        />
        {camera.status === 'requesting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 p-6 text-white">
            <RefreshCw className="mb-3 size-8 text-teal-400 motion-safe:animate-spin" aria-hidden="true" />
            <p className="text-sm font-medium">Initializing camera stream...</p>
          </div>
        )}
        {/* Scanning targeting guide overlay */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center border-3 border-teal-500/40">
          <div className="relative flex size-48 items-center justify-center rounded-lg border-2 border-teal-400 motion-safe:animate-pulse">
            {/* Guide line animation */}
            <div className="absolute inset-x-0 h-0.5 bg-teal-400 shadow-glow motion-safe:animate-[bounce_2s_infinite]" />
          </div>
        </div>
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
          Align QR code inside frame
        </div>
        {renderCameraProblem()}
      </div>
    );
  };

  // Render file dropzone viewfinder state
  const renderFileViewfinder = () => {
    return (
      <>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
          aria-label="Upload QR code image file"
        />
        <Button
          variant="dropzone"
          data-dragover={dragOver || undefined}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleSelectFileClick}
        >
          {fileProcessing ? (
            <span className="flex flex-col items-center">
              <RefreshCw className="mb-3 size-8 text-accent motion-safe:animate-spin" aria-hidden="true" />
              <span className="text-sm font-medium text-fg-soft">Processing file...</span>
            </span>
          ) : (
            <span className="flex flex-col items-center">
              <FileImage className="mb-3 size-10 text-fg-muted" aria-hidden="true" />
              <span className="text-sm font-semibold text-fg-soft">
                Drag & Drop QR Image
              </span>
              <span className="mt-1 max-w-xs text-sm text-fg-muted">
                or click here to select a file from your device.
              </span>
            </span>
          )}

          {fileError && (
            <span className="mt-4 flex max-w-xs items-center gap-2 rounded-lg bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">
              <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
              <span>{fileError}</span>
            </span>
          )}
        </Button>
      </>
    );
  };

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
      {/* Scanner Mode Selector Header */}
      <div className="flex items-center justify-between gap-2 border-b border-line-subtle bg-surface-sunken p-3">
        <SegmentedControl<'webcam' | 'file'>
          label="Scanner input"
          value={mode}
          onChange={(next) => {
            if (fileAbortControllerRef.current) {
              fileAbortControllerRef.current.abort();
              fileAbortControllerRef.current = null;
            }
            setMode(next);
            setIsWebcamActive(next === 'webcam');
            setFileError(null);
            setFileProcessing(false);
          }}
          options={[
            {
              value: 'webcam',
              label: (
                <>
                  <Camera className="size-4" aria-hidden="true" />
                  Webcam
                </>
              ),
            },
            {
              value: 'file',
              label: (
                <>
                  <Upload className="size-4" aria-hidden="true" />
                  File Upload
                </>
              ),
            },
          ]}
        />

        {onClose && (
          <Button variant="icon" iconOnly size="sm" shape="round" onClick={onClose} aria-label="Close scanner">
            <X className="size-4" aria-hidden="true" />
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
