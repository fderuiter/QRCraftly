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

import { useState, useEffect, useRef, useCallback } from 'react';
import { useCamera } from './useCamera';
import { useAdaptiveScanner } from './useAdaptiveScanner';
import { StreamLookaheadReceiver, DANGEROUS_SCHEMES } from '../engine/StreamLookahead';
import { triggerFileDownload } from '../utils/downloadManager';

/**
 * Handshake information sent at the beginning of a file transfer session.
 */
export interface HandshakeInfo {
  /**
   * File name.
   */
  fileName: string;
  /**
   * Total file size in bytes.
   */
  fileSize: number;
  /**
   * MIME type of the file.
   */
  mimeType: string;
  /**
   * Expected SHA-256 hash of the complete file binary.
   */
  sha256: string;
}

/**
 * Options for the useAnimatedQrReceiver hook.
 */
export interface UseAnimatedQrReceiverOptions {
  /**
   * Optional toast notification callback.
   */
  addToast?: (toast: {
    /**
     *
     */
    type: 'success' | 'info' | 'error' | 'warning';
    /**
     *
     */
    message: string;
    /**
     *
     */
    duration?: number;
  }) => void;
  /**
   * Whether data frames require a prior handshake frame before processing.
   */
  handshakeRequired?: boolean;
  /** Stream format mode: either 'text' or 'binary'. Defaults to 'text'. */
  streamMode?: 'text' | 'binary';
  /** Automatically trigger download when complete. Defaults to true. */
  autoDownload?: boolean;
  /** Initial input mode: 'camera' or 'file'. Defaults to 'camera'. */
  initialMode?: 'camera' | 'file';
}

/**
 * Unified React hook to handle camera streams, video file uploads, adaptive scanning, chunk tracking,
 * and sequential data reassembly for receiving.
 * @param options - Hook options.
 * @param options.addToast
 * @param options.handshakeRequired
 * @param options.streamMode
 * @param options.autoDownload
 * @param options.initialMode
 * @returns Animated QR receiver controls and state.
 */
export function useAnimatedQrReceiver({
  addToast,
  handshakeRequired = false,
  streamMode = 'text',
  autoDownload = true,
  initialMode = 'camera',
}: UseAnimatedQrReceiverOptions = {}) {
  // Core states - chunks tracks completed chunk indices without storing raw Base64 strings
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
  const reassembledDataRef = useRef<Uint8Array | null>(null);

  const autoDownloadRef = useRef(autoDownload);
  useEffect(() => {
    autoDownloadRef.current = autoDownload;
  }, [autoDownload]);

  const addToastRef = useRef(addToast);
  useEffect(() => {
    addToastRef.current = addToast;
  }, [addToast]);

  // Sync lookahead receiver configuration with streamMode option
  useEffect(() => {
    lookaheadRef.current = new StreamLookaheadReceiver({ mode: streamMode });
  }, [streamMode]);

  // useCamera hook
  const camera = useCamera();
  const { startStream, stopStream, stream } = camera;

  const initWorker = useCallback(() => {
    if (!workerRef.current) {
      const worker = new Worker(
        new URL('../utils/fileReassemblyWorker.ts', import.meta.url),
        { type: 'module' }
      );

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

            if (activeHandshake) {
              // Compute and verify SHA-256
              const hashBuffer = await crypto.subtle.digest('SHA-256', reassembled);
              const hashArray = Array.from(new Uint8Array(hashBuffer));
              const actualSHA256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

              if (actualSHA256 !== activeHandshake.sha256) {
                throw new Error(`Integrity validation failed! SHA-256 hash does not match handshake value.\nExpected: ${activeHandshake.sha256}\nActual: ${actualSHA256}`);
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
            setReceiverError(err?.message || 'Verification or reassembly failed.');
            setReceiverSuccess(false);
            setReassembledData(null);
            reassembledDataRef.current = null;
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
      } catch {
        // Ignore if detached
      }
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  // Defensive hardware flush sequence for DOM-specific video elements
  const flushVideoHardware = useCallback(() => {
    if (videoRef.current) {
      videoElementRef.current = videoRef.current;
    }
    const video = videoElementRef.current || videoRef.current;
    if (video) {
      try {
        if (typeof video.pause === 'function') {
          video.pause();
        }
        video.srcObject = null;
        if (typeof video.removeAttribute === 'function') {
          video.removeAttribute('src');
        }
        if (typeof video.load === 'function') {
          video.load();
        }
      } catch {
        // Safe catch for unmounted or detached video elements
      }
    }
  }, []);

  // Safely revoke any active video file Object URL
  const revokeVideoUrl = useCallback(() => {
    if (videoObjectUrlRef.current) {
      try {
        URL.revokeObjectURL(videoObjectUrlRef.current);
      } catch {
        // safe catch
      }
      videoObjectUrlRef.current = null;
      setVideoObjectUrl(null);
    }
  }, []);

  // Mode switcher handler
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

  // Video file upload and MIME type validation handler
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
    revokeVideoUrl(); // Revoke any previously generated Object URL

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

  // Reset/Clear state
  const handleClear = useCallback(() => {
    terminateWorker();
    setChunks(new Set());
    setTotalChunks(null);
    setHandshake(null);
    handshakeRef.current = null;
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

  // Reassemble and validate file
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
          const hashBuffer = await crypto.subtle.digest('SHA-256', data.buffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const actualSHA256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

          if (actualSHA256 !== hs.sha256) {
            throw new Error(`Integrity validation failed! SHA-256 hash does not match handshake value.\nExpected: ${hs.sha256}\nActual: ${actualSHA256}`);
          }
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
        // Fallback for legacy batch calls
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
      setReceiverError(err?.message || 'Verification or reassembly failed.');
      setReceiverSuccess(false);
    } finally {
      setIsVerifying(false);
      setCompilationStatus(null);
    }
  }, [reassembledData, initWorker]);

  // Frame processor
  const handleFrame = useCallback(async (decodedText: string) => {
    if (!decodedText || receiverSuccess || isVerifying) return;
    // A new handshake starts a new transfer and must be able to clear a prior error.
    if (receiverError && !decodedText.startsWith('H|')) return;

    // Synchronously track and discard duplicates before downstream lookahead or direct scheme check
    if (decodedText.startsWith('F|')) {
      const parts = decodedText.split('|');
      if (parts.length === 4) {
        const index = parseInt(parts[1], 10);
        const total = parseInt(parts[2], 10);
        if (!isNaN(index) && !isNaN(total)) {
          if (total < 1 || total > 5000 || index < 0 || index >= total) {
            const errMsg = total < 1 || total > 5000
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
          if (processedIndicesRef.current.has(index)) {
            return; // Duplicate frame, discard synchronously
          }
          processedIndicesRef.current.add(index);
        }
      }
    }

    // 1. Direct scheme check on raw decoded frame text
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

    // 2. Incremental lookahead check
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
          } catch (_e) {
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

    // 3. Process handshake & data protocols
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

          // Pre-allocate memory buffer in worker off-thread using handshake metadata
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
              // Ignore data frames until handshake is scanned
              return;
            }

            setTotalChunks(total);
            setChunks(prev => {
              if (prev.has(index)) return prev;
              const next = new Set(prev);
              next.add(index);
              return next;
            });

            // Stream raw chunk immediately to worker off-thread without storing Base64 string in main-thread state
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

  // Hook into useAdaptiveScanner
  const { startScanning, stopScanning } = useAdaptiveScanner({
    videoRef,
    onScanSuccess: (data) => {
      handleFrame(data);
    },
    onScanFail: () => {
      // Expected scan frame decode failures on standard camera stream frames
    },
  });

  // Sync camera stream or video file to video ref
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
        startScanning();
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
        startScanning();
      }
    } else {
      stopScanning();
      flushVideoHardware();
    }
  }, [isScanning, stream, receiverMode, videoObjectUrl, startScanning, stopScanning, flushVideoHardware]);

  // Start / Stop sessions
  const startCameraSession = useCallback(async () => {
    setSecurityAlert(null);
    processedIndicesRef.current.clear();
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

  // Completion checking effect
  useEffect(() => {
    if (totalChunks !== null && chunks.size === totalChunks && !downloadTriggered) {
      revokeVideoUrl();
      if (autoDownload) {
        setDownloadTriggered(true);
        stopCameraSession();
        if (reassembledData) {
          reconstructAndValidateFile(undefined, totalChunks, handshake || undefined);
        }
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanning();
      stopStream();
      flushVideoHardware();
      terminateWorker();
      revokeVideoUrl();
    };
  }, [stopScanning, stopStream, terminateWorker, flushVideoHardware, revokeVideoUrl]);

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
    videoObjectUrl,
    fileValidationError,
    handleFileUpload,
    revokeVideoUrl,
  };
}
