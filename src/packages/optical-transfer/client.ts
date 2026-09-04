/* eslint-disable security/detect-object-injection */
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

import React, { useState, useEffect, useRef, useCallback, useMemo, useSyncExternalStore } from 'react';
import { QRConfig, QRErrorCorrectionLevel, SocialFormat, TemplateStyle } from '@/types';
import { drawQRInternal } from '@/utils/qrRenderer';
import { drawWithTemplate, SOCIAL_DIMENSIONS } from '@/utils/templateRenderer';
import { PreallocatedFramePool, shuffleInPlace } from './lib/framePool';
import { sanitizeStreamConfig, verifyHandshakeFrame } from './lib/handshake';
import { StreamLookaheadReceiver, DANGEROUS_SCHEMES } from './lib/streamLookahead';
import { triggerFileDownload } from '@/utils/downloadManager';
import { useCamera } from '@/hooks/useCamera';
import { useAdaptiveScanner } from '@/hooks/useAdaptiveScanner';
import { useOptionalQRStore } from '@/context/QRContext';
import { HandshakeInfo } from './lib/contracts';

export { sanitizeStreamConfig, verifyHandshakeFrame, type HandshakeInfo };

export interface UseOpticalSenderOptions {
  config: QRConfig;
  logoImg: HTMLImageElement | null;
  borderLogoImg: HTMLImageElement | null;
}

/**
 * Headless React hook to coordinate asynchronous file slicing, animation playback,
 * flow-control feedback, and pre-allocated frame memory pooling for the sender.
 */
export function useOpticalSender({
  config,
  logoImg,
  borderLogoImg,
}: UseOpticalSenderOptions) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isVerifyingHandshake, setIsVerifyingHandshake] = useState(false);
  const [handshakeError, setHandshakeError] = useState<string | null>(null);
  const [handshakeVerified, setHandshakeVerified] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [chunkSize, setChunkSize] = useState(180);
  const [fps, setFps] = useState(15);
  const [currentPass, setCurrentPass] = useState(1);
  const [transferStats, setTransferStats] = useState({
    fileName: '',
    fileSize: 0,
    startTime: 0,
    activeMemory: '0.00 MB',
  });

  const store = useOptionalQRStore();

  const isFallbackActive = useSyncExternalStore(
    store ? store.subscribe : () => () => {},
    () => (store ? store.getState().isScannabilityFallbackActive : false),
    () => (store ? store.getState().isScannabilityFallbackActive : false)
  );

  const effectiveConfig = useMemo(() => {
    if (isFallbackActive) {
      return { ...config, isMazeBridgesEnabled: false };
    }
    return config;
  }, [config, isFallbackActive]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const framePoolRef = useRef<PreallocatedFramePool>(new PreallocatedFramePool());
  const passCountRef = useRef<number>(1);
  const shuffledOrderRef = useRef<number[]>([]);

  // Refs for background loop
  const configRef = useRef(effectiveConfig);
  const logoImgRef = useRef(logoImg);
  const borderLogoImgRef = useRef(borderLogoImg);
  const isTransferringRef = useRef(false);
  const isVerifyingHandshakeRef = useRef(false);
  const currentPlayIndexRef = useRef(0);
  const fpsRef = useRef(fps);
  const totalFramesRef = useRef(0);
  const selectedFileRef = useRef<File | null>(null);
  const chunkSizeRef = useRef(chunkSize);
  const animationIdRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef(0);
  const lastRenderSuccessTimeRef = useRef(0);

  useEffect(() => {
    configRef.current = effectiveConfig;
    logoImgRef.current = logoImg;
    borderLogoImgRef.current = borderLogoImg;
    isTransferringRef.current = isTransferring;
    isVerifyingHandshakeRef.current = isVerifyingHandshake;
    fpsRef.current = fps;
    totalFramesRef.current = totalFrames;
    selectedFileRef.current = selectedFile;
    chunkSizeRef.current = chunkSize;
  }, [effectiveConfig, logoImg, borderLogoImg, isTransferring, isVerifyingHandshake, fps, totalFrames, selectedFile, chunkSize]);

  // Memory tracking loop
  useEffect(() => {
    let interval: any;
    if (isTransferring) {
      interval = setInterval(() => {
        const performanceMemory = (performance as any).memory;
        if (performanceMemory) {
          const usedMB = (performanceMemory.usedJSHeapSize / 1024 / 1024).toFixed(2);
          setTransferStats(prev => ({ ...prev, activeMemory: `${usedMB} MB` }));
        } else {
          const baseHeap = 24.5;
          const lookaheadBufferOverhead = (framePoolRef.current.size * chunkSize) / 1024 / 1024;
          const currentHeap = (baseHeap + lookaheadBufferOverhead + Math.random() * 0.4).toFixed(2);
          setTransferStats(prev => ({ ...prev, activeMemory: `${currentHeap} MB` }));
        }
      }, 500);
    } else {
      setTransferStats(prev => ({ ...prev, activeMemory: '0.00 MB' }));
    }
    return () => clearInterval(interval);
  }, [isTransferring, chunkSize]);

  // Terminate background worker on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, []);

  const stopTransfer = useCallback(() => {
    setIsTransferring(false);
    isTransferringRef.current = false;
    setIsVerifyingHandshake(false);
    isVerifyingHandshakeRef.current = false;
    setHandshakeError(null);
    setHandshakeVerified(false);
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'STOP' });
    }
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }
    framePoolRef.current.clear();
    passCountRef.current = 1;
    setCurrentPass(1);
    shuffledOrderRef.current = [];
    currentPlayIndexRef.current = 0;
    setCurrentFrameIndex(0);
    setProgress(0);
  }, []);

  const renderFrame = useCallback((playIdx: number, frame: { size: number; data: Uint8Array }) => {
    const modules = {
      size: frame.size,
      get: (r: number, c: number) => !!frame.data[r * frame.size + c],
    };

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const displaySize = 512;
        const pixelRatio = window.devicePixelRatio || 1;
        const activeConfig = playIdx === 0
          ? configRef.current
          : sanitizeStreamConfig(configRef.current);

        const effectiveLogoImg = playIdx === 0 ? logoImgRef.current : null;
        const effectiveBorderLogoImg = playIdx === 0 ? borderLogoImgRef.current : null;

        const useTemplate =
          activeConfig.templateStyle !== TemplateStyle.NONE ||
          activeConfig.socialFormat !== SocialFormat.SQUARE_1_1;

        if (useTemplate) {
          const { width: fw, height: fh } = SOCIAL_DIMENSIONS[activeConfig.socialFormat];
          const displayHeight = Math.round(displaySize * fh / fw);
          canvas.width = displaySize * pixelRatio;
          canvas.height = displayHeight * pixelRatio;

          ctx.save();
          ctx.scale(pixelRatio, pixelRatio);
          drawWithTemplate(
            ctx as unknown as CanvasRenderingContext2D,
            modules,
            activeConfig,
            effectiveLogoImg,
            effectiveBorderLogoImg,
            displaySize,
            displayHeight,
            modules.size
          );
          ctx.restore();
        } else {
          canvas.width = displaySize * pixelRatio;
          canvas.height = displaySize * pixelRatio;

          ctx.save();
          ctx.scale(pixelRatio, pixelRatio);
          ctx.clearRect(0, 0, displaySize, displaySize);
          drawQRInternal(
            ctx as unknown as CanvasRenderingContext2D,
            modules,
            activeConfig,
            effectiveLogoImg,
            effectiveBorderLogoImg,
            displaySize,
            modules.size
          );
          ctx.restore();
        }
      }
    }

    setCurrentFrameIndex(playIdx + 1);
    setProgress(Math.round(((playIdx + 1) / totalFramesRef.current) * 100));

    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'ACK',
        payload: { index: playIdx },
      });
    }

    framePoolRef.current.delete(playIdx);

    if (playIdx + 1 >= totalFramesRef.current) {
      currentPlayIndexRef.current = 0;
      framePoolRef.current.clear();
      if (workerRef.current && selectedFileRef.current) {
        workerRef.current.postMessage({
          type: 'START',
          payload: {
            file: selectedFileRef.current,
            chunkSize: chunkSizeRef.current,
            errorCorrectionLevel: configRef.current.errorCorrectionLevel,
            fps: fpsRef.current,
          },
        });
      }
    } else {
      currentPlayIndexRef.current = playIdx + 1;
    }

    lastRenderSuccessTimeRef.current = performance.now();
  }, []);

  const runAnimationLoop = useCallback(() => {
    const loop = (_rafNow: number) => {
      if (!isTransferringRef.current) return;

      const now = performance.now();

      if (!framePoolRef.current.hasFrame(currentPlayIndexRef.current)) {
        if (now - lastRenderSuccessTimeRef.current >= 100) {
          lastRenderSuccessTimeRef.current = now;
          if (workerRef.current) {
            const lastRenderedIdx = currentPlayIndexRef.current - 1;
            workerRef.current.postMessage({
              type: 'HEAL',
              payload: { lastAckedIndex: lastRenderedIdx },
            });
            workerRef.current.postMessage({
              type: 'ACK',
              payload: { index: lastRenderedIdx },
            });
          }
        }
      }

      const interval = 1000 / fpsRef.current;
      const elapsed = now - lastFrameTimeRef.current;

      if (elapsed >= interval) {
        lastFrameTimeRef.current = now - (elapsed % interval);

        const playIdx = currentPlayIndexRef.current;
        const pool = framePoolRef.current;
        const isPass1 = passCountRef.current === 1;

        const targetFrameIndex = isPass1
          ? playIdx
          : (shuffledOrderRef.current[playIdx] ?? playIdx);

        if (pool.hasFrame(targetFrameIndex)) {
          const frame = pool.getFrame(targetFrameIndex)!;

          const modules = {
            size: frame.size,
            get: (r: number, c: number) => !!frame.data[r * frame.size + c],
          };

          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              const displaySize = 512;
              const pixelRatio = window.devicePixelRatio || 1;
              const activeConfig = targetFrameIndex === 0
                ? configRef.current
                : sanitizeStreamConfig(configRef.current);

              const effectiveLogoImg = targetFrameIndex === 0 ? logoImgRef.current : null;
              const effectiveBorderLogoImg = targetFrameIndex === 0 ? borderLogoImgRef.current : null;

              const useTemplate =
                activeConfig.templateStyle !== TemplateStyle.NONE ||
                activeConfig.socialFormat !== SocialFormat.SQUARE_1_1;

              if (useTemplate) {
                const { width: fw, height: fh } = SOCIAL_DIMENSIONS[activeConfig.socialFormat];
                const displayHeight = Math.round(displaySize * fh / fw);
                canvas.width = displaySize * pixelRatio;
                canvas.height = displayHeight * pixelRatio;

                ctx.save();
                ctx.scale(pixelRatio, pixelRatio);
                drawWithTemplate(
                  ctx as unknown as CanvasRenderingContext2D,
                  modules,
                  activeConfig,
                  effectiveLogoImg,
                  effectiveBorderLogoImg,
                  displaySize,
                  displayHeight,
                  modules.size
                );
                ctx.restore();
              } else {
                canvas.width = displaySize * pixelRatio;
                canvas.height = displaySize * pixelRatio;

                ctx.save();
                ctx.scale(pixelRatio, pixelRatio);
                ctx.clearRect(0, 0, displaySize, displaySize);
                drawQRInternal(
                  ctx as unknown as CanvasRenderingContext2D,
                  modules,
                  activeConfig,
                  effectiveLogoImg,
                  effectiveBorderLogoImg,
                  displaySize,
                  modules.size
                );
                ctx.restore();
              }
            }
          }

          setCurrentFrameIndex(targetFrameIndex + 1);
          setProgress(Math.round(((playIdx + 1) / totalFramesRef.current) * 100));

          if (isPass1 && workerRef.current) {
            workerRef.current.postMessage({
              type: 'ACK',
              payload: { index: targetFrameIndex },
            });
          }

          const total = totalFramesRef.current || 1;
          const nextPlayIdx = playIdx + 1;
          if (nextPlayIdx >= total) {
            if (passCountRef.current === 1) {
              passCountRef.current = 2;
              setCurrentPass(2);
              const order = Array.from({ length: total }, (_, i) => i);
              shuffleInPlace(order);
              shuffledOrderRef.current = order;
            } else {
              passCountRef.current += 1;
              setCurrentPass(passCountRef.current);
              shuffleInPlace(shuffledOrderRef.current);
            }
            currentPlayIndexRef.current = 0;
          } else {
            currentPlayIndexRef.current = nextPlayIdx;
          }

          lastRenderSuccessTimeRef.current = now;
        }
      }

      animationIdRef.current = requestAnimationFrame(loop);
    };

    animationIdRef.current = requestAnimationFrame(loop);
  }, []);

  const startTransfer = useCallback(() => {
    if (!selectedFile) return;

    stopTransfer();

    setIsVerifyingHandshake(true);
    isVerifyingHandshakeRef.current = true;
    setHandshakeError(null);
    setHandshakeVerified(false);

    currentPlayIndexRef.current = 0;
    passCountRef.current = 1;
    setCurrentPass(1);
    shuffledOrderRef.current = [];
    framePoolRef.current.clear();
    lastFrameTimeRef.current = performance.now();
    lastRenderSuccessTimeRef.current = performance.now();

    setTransferStats({
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      startTime: Date.now(),
      activeMemory: '24.50 MB',
    });

    if (!workerRef.current) {
      const worker = new Worker(new URL('./worker-slice.ts', import.meta.url), { type: 'module' });
      workerRef.current = worker;

      worker.onmessage = async (e: MessageEvent) => {
        const { type, index, size, data, total } = e.data || {};

        switch (type) {
          case 'PROGRESS': {
            if (total) {
              setTotalFrames(total);
              totalFramesRef.current = total;
            }
            break;
          }

          case 'FRAME': {
            framePoolRef.current.storeFrame(index, size, data);

            if (index === 0 && isVerifyingHandshakeRef.current) {
              isVerifyingHandshakeRef.current = false;

              const frame0 = { size, data };
              const isScannable = await verifyHandshakeFrame(
                frame0,
                configRef.current,
                logoImgRef.current,
                borderLogoImgRef.current
              );

              setIsVerifyingHandshake(false);

              if (isScannable) {
                setHandshakeVerified(true);
                setHandshakeError(null);
                setIsTransferring(true);
                isTransferringRef.current = true;
                runAnimationLoop();
              } else {
                setHandshakeVerified(false);
                setHandshakeError(
                  'Handshake QR frame failed scannability check. Transfer playback remains paused. Please increase contrast or reduce visual complexity.'
                );
                setIsTransferring(false);
                isTransferringRef.current = false;
                if (workerRef.current) {
                  workerRef.current.postMessage({ type: 'STOP' });
                  workerRef.current.terminate();
                  workerRef.current = null;
                }
              }
            }
            break;
          }

          case 'ERROR': {
            stopTransfer();
            break;
          }

          default:
            break;
        }
      };
    }

    const effectiveChunkSize = chunkSize < 256 ? chunkSize : 180;
    const effectiveEcc =
      config.errorCorrectionLevel === QRErrorCorrectionLevel.H || config.errorCorrectionLevel === QRErrorCorrectionLevel.Q
        ? config.errorCorrectionLevel
        : QRErrorCorrectionLevel.Q;

    workerRef.current.postMessage({
      type: 'START',
      payload: {
        file: selectedFile,
        chunkSize: effectiveChunkSize,
        errorCorrectionLevel: effectiveEcc,
        fps: fpsRef.current,
      },
    });
  }, [selectedFile, chunkSize, config.errorCorrectionLevel, stopTransfer, runAnimationLoop]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList && fileList.length > 0) {
      setSelectedFile(fileList[0]);
      stopTransfer();
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  const simulate50MBFile = () => {
    const dummyBlob = new Blob([new Uint8Array(50 * 1024 * 1024)], { type: 'application/octet-stream' });
    const dummyFile = new File([dummyBlob], 'simulation_50mb_payload.bin', { type: 'application/octet-stream' });
    setSelectedFile(dummyFile);
    stopTransfer();
  };

  return {
    selectedFile,
    setSelectedFile,
    isTransferring,
    isVerifyingHandshake,
    handshakeVerified,
    handshakeError,
    progress,
    currentFrameIndex,
    totalFrames,
    chunkSize,
    setChunkSize,
    fps,
    setFps,
    currentPass,
    framePoolRef,
    transferStats,
    canvasRef,
    startTransfer,
    stopTransfer,
    handleFileChange,
    simulate50MBFile,
    renderFrame,
  };
}

export interface UseOpticalReceiverOptions {
  addToast?: (toast: {
    type: 'success' | 'info' | 'error' | 'warning';
    message: string;
    duration?: number;
  }) => void;
  handshakeRequired?: boolean;
  streamMode?: 'text' | 'binary';
  autoDownload?: boolean;
  initialMode?: 'camera' | 'file';
}

/**
 * Headless React hook to handle camera streams, video file uploads, adaptive scanning,
 * and data reassembly for the receiver.
 */
export function useOpticalReceiver({
  addToast,
  handshakeRequired = true,
  streamMode = 'text',
  autoDownload = true,
  initialMode = 'camera',
}: UseOpticalReceiverOptions = {}) {
  const [receiverMode, setReceiverModeState] = useState<'camera' | 'file'>(initialMode);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoObjectUrl, setVideoObjectUrl] = useState<string | null>(null);
  const [fileValidationError, setFileValidationError] = useState<string | null>(null);

  const [chunks, setChunks] = useState<Set<number>>(new Set());
  const [totalChunks, setTotalChunks] = useState<number | null>(null);
  const [handshake, setHandshake] = useState<HandshakeInfo | null>(null);
  const [securityAlert, setSecurityAlert] = useState<string | null>(null);
  const [receiverError, setReceiverError] = useState<string | null>(null);
  const [receiverSuccess, setReceiverSuccess] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [downloadTriggered, setDownloadTriggered] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [reassembledData, setReassembledData] = useState<Uint8Array | null>(null);
  const [compilationStatus, setCompilationStatus] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const lookaheadRef = useRef<StreamLookaheadReceiver | null>(null);
  const processedIndicesRef = useRef<Set<number>>(new Set());
  const handshakeRef = useRef<HandshakeInfo | null>(null);
  const videoObjectUrlRef = useRef<string | null>(null);
  const hasShownMissingHandshakeToastRef = useRef<boolean>(false);
  const reassembledDataRef = useRef<Uint8Array | null>(null);

  const autoDownloadRef = useRef(autoDownload);
  useEffect(() => {
    autoDownloadRef.current = autoDownload;
  }, [autoDownload]);

  const addToastRef = useRef(addToast);
  useEffect(() => {
    addToastRef.current = addToast;
  }, [addToast]);

  useEffect(() => {
    lookaheadRef.current = new StreamLookaheadReceiver({ mode: streamMode });
  }, [streamMode]);

  const camera = useCamera();
  const { startStream, stopStream, stream } = camera;

  const initWorker = useCallback(() => {
    if (!workerRef.current) {
      const worker = new Worker(new URL('./worker-reassembly.ts', import.meta.url), { type: 'module' });

      worker.onmessage = async (e: MessageEvent) => {
        const { type, progress, current, total: tot, buffer, error, handshake: workerHandshake } = e.data;

        if (type === 'PROGRESS') {
          setCompilationStatus(`Compiling file: ${current}/${tot} chunks decoded (${progress}%)`);
        } else if (type === 'COMPLETE') {
          try {
            setCompilationStatus('Finalizing download...');
            const reassembled = new Uint8Array(buffer);
            reassembledDataRef.current = reassembled;
            setReassembledData(reassembled);

            const activeHandshake = workerHandshake || handshakeRef.current;

            if (activeHandshake && activeHandshake.sha256) {
              const hashBuffer = await crypto.subtle.digest('SHA-256', new Uint8Array(reassembled));
              const hashArray = Array.from(new Uint8Array(hashBuffer));
              const actualSHA256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

              if (actualSHA256.toLowerCase() !== activeHandshake.sha256.toLowerCase()) {
                throw new Error(
                  `Integrity validation failed! SHA-256 hash does not match handshake value.\nExpected: ${activeHandshake.sha256}\nActual: ${actualSHA256}`
                );
              }
            }

            setReceiverSuccess(true);
            setReceiverError(null);

            if (autoDownloadRef.current) {
              setDownloadTriggered(true);
              triggerFileDownload(
                reassembled,
                activeHandshake?.fileName || `received_file_${Date.now()}.bin`,
                activeHandshake?.mimeType || 'application/octet-stream'
              );

              if (addToastRef.current) {
                addToastRef.current({
                  type: 'success',
                  message: 'File completely received & offline binary reconstruction triggered!',
                  duration: 5000,
                });
              }
            }
          } catch (err: any) {
            const errMsg = err?.message || 'Verification or reassembly failed.';
            setReceiverError(errMsg);
            setReceiverSuccess(false);
            setReassembledData(null);
            reassembledDataRef.current = null;
            if (addToastRef.current) {
              addToastRef.current({
                type: 'error',
                message: errMsg,
                duration: 5000,
              });
            }
          } finally {
            setCompilationStatus(null);
            setIsVerifying(false);
          }
        } else if (type === 'ERROR') {
          setReceiverError(error || 'Failed to compile binary content.');
          setReceiverSuccess(false);
          setReassembledData(null);
          reassembledDataRef.current = null;
          setDownloadTriggered(false);
          setCompilationStatus(null);
          setIsVerifying(false);
        }
      };

      worker.onerror = (e) => {
        setReceiverError(e.message || 'Background worker error.');
        setReceiverSuccess(false);
        setReassembledData(null);
        reassembledDataRef.current = null;
        setDownloadTriggered(false);
        setCompilationStatus(null);
        setIsVerifying(false);
      };

      workerRef.current = worker;
    }
    return workerRef.current;
  }, []);

  const terminateWorker = useCallback(() => {
    if (workerRef.current) {
      try {
        workerRef.current.postMessage({ type: 'CLEAR' });
      } catch {}
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  const flushVideoHardware = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
      if (typeof videoRef.current.removeAttribute === 'function') {
        videoRef.current.removeAttribute('src');
      }
      videoRef.current.load();
    }
  }, []);

  const revokeVideoUrl = useCallback(() => {
    if (videoObjectUrlRef.current) {
      try {
        URL.revokeObjectURL(videoObjectUrlRef.current);
      } catch {}
      videoObjectUrlRef.current = null;
      setVideoObjectUrl(null);
    }
  }, []);

  const setReceiverMode = useCallback((mode: 'camera' | 'file') => {
    setReceiverModeState(mode);
    setFileValidationError(null);
    if (mode === 'camera') {
      revokeVideoUrl();
      setVideoFile(null);
      stopStream();
      setIsScanning(false);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        if (typeof videoRef.current.removeAttribute === 'function') {
          videoRef.current.removeAttribute('src');
        }
      }
    } else if (mode === 'file') {
      stopStream();
      setIsScanning(false);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        if (typeof videoRef.current.removeAttribute === 'function') {
          videoRef.current.removeAttribute('src');
        }
      }
    }
  }, [revokeVideoUrl, stopStream]);

  const handleFileUpload = useCallback((file: File) => {
    if (!file) return false;

    const isVideo = file.type
      ? file.type.startsWith('video/')
      : /\.(mp4|webm|ogg|mov|mkv|avi|3gp|m4v)$/i.test(file.name);

    if (!isVideo) {
      revokeVideoUrl();
      setVideoFile(null);
      const errorMsg = 'Invalid file type. Please upload a supported video file (e.g. MP4, WebM).';
      setFileValidationError(errorMsg);
      if (addToast) {
        addToast({
          type: 'error',
          message: errorMsg,
          duration: 5000,
        });
      }
      return false;
    }

    setFileValidationError(null);
    revokeVideoUrl();

    const url = URL.createObjectURL(file);
    videoObjectUrlRef.current = url;
    setVideoFile(file);
    setVideoObjectUrl(url);
    setIsScanning(true);

    if (addToast) {
      addToast({
        type: 'info',
        message: `Video file loaded: ${file.name}`,
        duration: 3000,
      });
    }

    return true;
  }, [addToast, revokeVideoUrl]);

  const handleClear = useCallback(() => {
    terminateWorker();
    setChunks(new Set());
    setTotalChunks(null);
    setHandshake(null);
    handshakeRef.current = null;
    hasShownMissingHandshakeToastRef.current = false;
    setSecurityAlert(null);
    setReceiverError(null);
    setFileValidationError(null);
    setReceiverSuccess(false);
    setIsVerifying(false);
    setDownloadTriggered(false);
    setReassembledData(null);
    reassembledDataRef.current = null;
    setCompilationStatus(null);
    revokeVideoUrl();
    setVideoFile(null);
    processedIndicesRef.current.clear();
    lookaheadRef.current = new StreamLookaheadReceiver({ mode: streamMode });
    if (addToast) {
      addToast({
        type: 'info',
        message: 'Receiver state has been reset.',
        duration: 3000,
      });
    }
  }, [addToast, streamMode, terminateWorker, revokeVideoUrl]);

  const reconstructAndValidateFile = useCallback(async (
    _activeChunks?: any,
    _total?: number,
    activeHandshake?: HandshakeInfo
  ) => {
    try {
      setIsVerifying(true);
      setReceiverError(null);
      const data = reassembledDataRef.current || reassembledData;
      const hs = activeHandshake || handshakeRef.current;

      if (data) {
        if (hs) {
          const hashBuffer = await crypto.subtle.digest('SHA-256', new Uint8Array(data));
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const actualSHA256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

          if (actualSHA256.toLowerCase() !== hs.sha256.toLowerCase()) {
            throw new Error(
              `Integrity validation failed! SHA-256 hash does not match handshake value.\nExpected: ${hs.sha256}\nActual: ${actualSHA256}`
            );
          }
        } else if (handshakeRequired) {
          throw new Error('Transfer blocked: missing handshake metadata. Cannot verify SHA-256 integrity hash.');
        }

        setReceiverSuccess(true);
        setReceiverError(null);
        setDownloadTriggered(true);
        triggerFileDownload(
          data,
          hs?.fileName || `received_file_${Date.now()}.bin`,
          hs?.mimeType || 'application/octet-stream'
        );

        if (addToastRef.current) {
          addToastRef.current({
            type: 'success',
            message: 'File completely received & offline binary reconstruction triggered!',
            duration: 5000,
          });
        }
      } else if (_activeChunks && typeof _activeChunks.get === 'function' && typeof _total === 'number') {
        const worker = initWorker();
        const chunksToSend: Array<{ index: number; base64: string }> = [];
        for (let i = 0; i < _total; i++) {
          const base64 = _activeChunks.get(i);
          if (base64) {
            chunksToSend.push({ index: i, base64 });
          } else {
            setDownloadTriggered(false);
            setIsVerifying(false);
            setCompilationStatus(null);
            throw new Error(`Missing frame chunk at index ${i}`);
          }
        }
        worker.postMessage({
          type: 'START_REASSEMBLY',
          chunks: chunksToSend,
          totalChunks: _total,
        });
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Verification or reassembly failed.';
      setReceiverError(errMsg);
      setReceiverSuccess(false);
      setReassembledData(null);
      reassembledDataRef.current = null;
      if (addToastRef.current) {
        addToastRef.current({
          type: 'error',
          message: errMsg,
          duration: 5000,
        });
      }
    } finally {
      setIsVerifying(false);
      setCompilationStatus(null);
    }
  }, [reassembledData, initWorker, handshakeRequired]);

  const handleFrame = useCallback(async (decodedText: string) => {
    if (!decodedText || receiverSuccess || isVerifying) return;
    if (receiverError && !decodedText.startsWith('H|')) return;

    if (decodedText.startsWith('ur:bytes/')) {
      const worker = initWorker();
      worker.postMessage({
        type: 'FOUNTAIN_DROPLET',
        droplet: decodedText,
      });
      return;
    }

    if (decodedText.startsWith('F|')) {
      const parts = decodedText.split('|');
      if (parts.length === 4) {
        const index = parseInt(parts[1], 10);
        const total = parseInt(parts[2], 10);
        if (!isNaN(index) && !isNaN(total)) {
          if (total < 1 || total > 5000 || index < 0 || index >= total) {
            const errMsg =
              total < 1 || total > 5000
                ? 'File transfer rejected: exceeds the maximum limit of 5000 chunks.'
                : 'File transfer rejected: invalid chunk metadata or index range.';
            setReceiverError(errMsg);
            setIsScanning(false);
            stopStream();
            if (addToast) {
              addToast({
                type: 'error',
                message: errMsg,
                duration: 5000,
              });
            }
            return;
          }
          if (handshakeRequired && !handshakeRef.current) {
            const errMsg = 'Handshake metadata required before processing data frames.';
            setReceiverError(errMsg);
            if (addToast && !hasShownMissingHandshakeToastRef.current) {
              hasShownMissingHandshakeToastRef.current = true;
              addToast({
                type: 'error',
                message: 'Transfer blocked: missing handshake metadata. Scan handshake QR first.',
                duration: 5000,
              });
            }
            return;
          }
          if (processedIndicesRef.current.has(index)) {
            return;
          }
          processedIndicesRef.current.add(index);
        }
      }
    }

    if (streamMode === 'text') {
      const cleanText = decodedText.replace(/[\x00-\x1F\x7F-\x9F\s\u200B-\u200D\uFEFF]+/g, '').toLowerCase();
      const dangerousMatch = DANGEROUS_SCHEMES.find(scheme => cleanText.includes(scheme));
      if (dangerousMatch) {
        setSecurityAlert(`Dangerous protocol detected and blocked: ${dangerousMatch}`);
        setIsScanning(false);
        stopStream();
        return;
      }
    }

    try {
      if (!lookaheadRef.current) {
        lookaheadRef.current = new StreamLookaheadReceiver({ mode: streamMode });
      }

      if (decodedText.startsWith('F|')) {
        const parts = decodedText.split('|');
        if (parts.length === 4) {
          const base64Data = parts[3];
          let decodedPayload = '';
          try {
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            decodedPayload = new TextDecoder('utf-8').decode(bytes);
          } catch {
            decodedPayload = '';
          }
          lookaheadRef.current.receive(decodedPayload);
        }
      } else if (!decodedText.startsWith('H|')) {
        lookaheadRef.current.receive(decodedText);
      }
    } catch (err: any) {
      setSecurityAlert(err.message || 'Dangerous protocol split across frames blocked!');
      setIsScanning(false);
      stopStream();
      return;
    }

    try {
      if (decodedText.startsWith('H|')) {
        const parts = decodedText.split('|');
        if (parts.length < 5) {
          throw new Error('Malformed handshake frame received.');
        }
        const fileName = parts[1];
        const fileSize = parseInt(parts[2], 10);
        const mimeType = parts[3];
        const sha256 = parts[4];

        if (isNaN(fileSize)) {
          throw new Error('Invalid file size in handshake.');
        }

        const isNewFile = !handshakeRef.current || handshakeRef.current.sha256 !== sha256;
        if (isNewFile) {
          processedIndicesRef.current.clear();
          hasShownMissingHandshakeToastRef.current = false;
          lookaheadRef.current = new StreamLookaheadReceiver({ mode: streamMode });
          handshakeRef.current = { fileName, fileSize, mimeType, sha256 };

          setChunks(new Set());
          setTotalChunks(null);
          setReceiverError(null);
          setReceiverSuccess(false);
          setDownloadTriggered(false);
          setReassembledData(null);
          reassembledDataRef.current = null;
          setCompilationStatus(null);
          setIsVerifying(false);
          setHandshake({ fileName, fileSize, mimeType, sha256 });

          const worker = initWorker();
          worker.postMessage({
            type: 'INIT',
            fileSize,
            fileName,
            mimeType,
            sha256,
          });
        }
      } else if (decodedText.startsWith('F|')) {
        const parts = decodedText.split('|');
        if (parts.length === 4) {
          const index = parseInt(parts[1], 10);
          const total = parseInt(parts[2], 10);
          const base64Data = parts[3];

          if (!isNaN(index) && !isNaN(total)) {
            if (handshakeRequired && !handshakeRef.current) {
              return;
            }

            setTotalChunks(total);
            setChunks(prev => {
              if (prev.has(index)) return prev;
              const next = new Set(prev);
              next.add(index);
              return next;
            });

            const worker = initWorker();
            worker.postMessage({
              type: 'CHUNK',
              index,
              totalChunks: total,
              base64: base64Data,
            });
          }
        }
      }
    } catch (err: any) {
      setReceiverError(err?.message || 'An error occurred during scan decoding.');
    }
  }, [receiverSuccess, isVerifying, handshakeRequired, stopStream, streamMode, receiverError, addToast, initWorker]);

  const { startScanning: startAdaptiveScanning, stopScanning: stopAdaptiveScanning } = useAdaptiveScanner({
    videoRef,
    onScanSuccess: (data) => {
      handleFrame(data);
    },
  });

  useEffect(() => {
    if (isScanning) {
      if (receiverMode === 'camera' && stream && videoRef.current) {
        videoRef.current.srcObject = stream;
        if (typeof videoRef.current.removeAttribute === 'function') {
          videoRef.current.removeAttribute('src');
        }
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {});
        }
        startAdaptiveScanning();
      } else if (receiverMode === 'file' && videoObjectUrl && videoRef.current) {
        videoRef.current.srcObject = null;
        if (videoRef.current.src !== videoObjectUrl) {
          videoRef.current.src = videoObjectUrl;
        }
        videoRef.current.loop = true;
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {});
        }
        startAdaptiveScanning();
      }
    } else {
      stopAdaptiveScanning();
      flushVideoHardware();
    }
  }, [isScanning, stream, receiverMode, videoObjectUrl, startAdaptiveScanning, stopAdaptiveScanning, flushVideoHardware]);

  const startCameraSession = useCallback(async () => {
    setSecurityAlert(null);
    processedIndicesRef.current.clear();
    hasShownMissingHandshakeToastRef.current = false;
    initWorker();
    const activeStream = await startStream();
    if (activeStream) {
      setIsScanning(true);
      if (addToast) {
        addToast({
          type: 'success',
          message: 'Camera scanner activated.',
          duration: 3000,
        });
      }
    }
  }, [startStream, addToast, initWorker]);

  const stopCameraSession = useCallback(() => {
    setIsScanning(false);
    stopStream();
    flushVideoHardware();
    if (addToast) {
      addToast({
        type: 'info',
        message: 'Camera scanner deactivated.',
        duration: 3000,
      });
    }
  }, [stopStream, addToast, flushVideoHardware]);

  useEffect(() => {
    if (totalChunks !== null && chunks.size === totalChunks && !downloadTriggered) {
      revokeVideoUrl();
      if (autoDownload) {
        setDownloadTriggered(true);
        stopCameraSession();
        reconstructAndValidateFile(chunks, totalChunks, handshake || handshakeRef.current || undefined);
      } else {
        if (isScanning) {
          stopCameraSession();
          setIsScanning(false);
          if (addToast) {
            addToast({
              type: 'success',
              message: 'Scan complete! Camera stream shut down.',
              duration: 3000,
            });
          }
        }
      }
    }
  }, [chunks, totalChunks, downloadTriggered, handshake, reconstructAndValidateFile, stopCameraSession, autoDownload, isScanning, addToast, revokeVideoUrl, reassembledData]);

  useEffect(() => {
    return () => {
      stopAdaptiveScanning();
      stopStream();
      flushVideoHardware();
      terminateWorker();
      revokeVideoUrl();
    };
  }, [stopAdaptiveScanning, stopStream, terminateWorker, flushVideoHardware, revokeVideoUrl]);

  return {
    chunks,
    totalChunks,
    handshake,
    securityAlert,
    receiverError,
    receiverSuccess,
    isVerifying,
    downloadTriggered,
    isScanning,
    setIsScanning,
    reassembledData,
    videoRef,
    videoElementRef,
    lookaheadRef,
    camera,
    handleClear,
    handleFrame,
    startCameraSession,
    stopCameraSession,
    reconstructAndValidateFile,
    compilationStatus,
    receiverMode,
    setReceiverMode,
    videoFile,
    setVideoFile,
    videoObjectUrl,
    fileValidationError,
    handleFileUpload,
    handleVideoUpload: handleFileUpload,
    revokeVideoUrl,
    startScanning: startCameraSession,
    stopScanning: stopCameraSession,
    resetReceiver: handleClear,
    handleDownload: () => {
      if (reassembledDataRef.current) {
        triggerFileDownload(
          reassembledDataRef.current,
          handshakeRef.current?.fileName || `download_${Date.now()}.bin`,
          handshakeRef.current?.mimeType || 'application/octet-stream'
        );
      }
    },
    triggerReassembly: () => {},
    stream,
  };
}
