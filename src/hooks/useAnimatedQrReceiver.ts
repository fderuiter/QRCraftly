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
 *
 */
export interface HandshakeInfo {
  /**
   *
   */
  fileName: string;
  /**
   *
   */
  fileSize: number;
  /**
   *
   */
  mimeType: string;
  /**
   *
   */
  sha256: string;
}

/**
 *
 */
export interface UseAnimatedQrReceiverOptions {
  /**
   *
   */
  addToast?: (toast: { /**
                        *
                        */
  type: 'success' | 'info' | 'error' | 'warning'; /**
                                                   *
                                                   */
  message: string; /**
                    *
                    */
  duration?: number }) => void;
  /**
   *
   */
  handshakeRequired?: boolean;
  /**
   * Stream format mode: either 'text' or 'binary'. Defaults to 'text'.
   */
  streamMode?: 'text' | 'binary';
  /**
   * Automatically trigger download when complete. Defaults to true.
   */
  autoDownload?: boolean;
}

/**
 * Unified React hook to handle camera streams, adaptive scanning, chunk tracking,
 * and sequential data reassembly for receiving.
 * @param root0
 * @param root0.addToast
 * @param root0.handshakeRequired
 * @param root0.streamMode
 * @param root0.autoDownload
 */
export function useAnimatedQrReceiver({
  addToast,
  handshakeRequired = true,
  streamMode = 'text',
  autoDownload = true,
}: UseAnimatedQrReceiverOptions = {}) {
  // Core states
  const [chunks, setChunks] = useState<Map<number, string>>(new Map());
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
  const hasShownMissingHandshakeToastRef = useRef<boolean>(false);

  // Sync lookahead receiver configuration with streamMode option
  useEffect(() => {
    lookaheadRef.current = new StreamLookaheadReceiver({ mode: streamMode });
  }, [streamMode]);

  // useCamera hook
  const camera = useCamera();
  const { startStream, stopStream, stream } = camera;

  const initWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('../utils/fileReassemblyWorker.ts', import.meta.url),
        { type: 'module' }
      );
    }
    return workerRef.current;
  }, []);

  const terminateWorker = useCallback(() => {
    if (workerRef.current) {
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

  // Reset/Clear state
  const handleClear = useCallback(() => {
    setChunks(new Map());
    setTotalChunks(null);
    setHandshake(null);
    handshakeRef.current = null;
    hasShownMissingHandshakeToastRef.current = false;
    setSecurityAlert(null);
    setReceiverError(null);
    setReceiverSuccess(false);
    setIsVerifying(false);
    setDownloadTriggered(false);
    setReassembledData(null);
    setCompilationStatus(null);
    terminateWorker();
    processedIndicesRef.current.clear();
    lookaheadRef.current = new StreamLookaheadReceiver({ mode: streamMode });
    if (addToast) {
      addToast({
        type: 'info',
        message: 'Receiver state has been reset.',
        duration: 3000,
      });
    }
  }, [addToast, streamMode, terminateWorker]);

  // Reassemble and validate file
  const reconstructAndValidateFile = useCallback(async (
    activeChunks: Map<number, string>,
    total: number,
    activeHandshake?: HandshakeInfo
  ) => {
    try {
      setIsVerifying(true);
      setReceiverError(null);
      setReceiverSuccess(false);
      setCompilationStatus('Initializing background compilation...');

      const worker = initWorker();
      const chunksToSend: Array<{ index: number; base64: string }> = [];
      for (let i = 0; i < total; i++) {
        const base64 = activeChunks.get(i);
        if (base64) {
          chunksToSend.push({ index: i, base64 });
        } else {
          setDownloadTriggered(false);
          setIsVerifying(false);
          setCompilationStatus(null);
          throw new Error(`Missing frame chunk at index ${i}`);
        }
      }

      worker.onmessage = async (e: MessageEvent) => {
        const { type, progress, current, total: tot, buffer, error } = e.data;

        if (type === 'PROGRESS') {
          setCompilationStatus(`Compiling file: ${current}/${tot} chunks decoded (${progress}%)`);
        } else if (type === 'COMPLETE') {
          try {
            setCompilationStatus('Finalizing download...');
            const reassembled = new Uint8Array(buffer);

            if (!activeHandshake) {
              throw new Error('Transfer blocked: Missing handshake metadata. Cannot verify SHA-256 integrity hash.');
            }

            // Compute and verify SHA-256
            const hashBuffer = await crypto.subtle.digest(
              'SHA-256',
              new Uint8Array(reassembled)
            );
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const actualSHA256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            if (actualSHA256.toLowerCase() !== activeHandshake.sha256.toLowerCase()) {
              throw new Error(`Integrity validation failed! SHA-256 hash does not match handshake value.\nExpected: ${activeHandshake.sha256}\nActual: ${actualSHA256}`);
            }

            setReassembledData(reassembled);
            setReceiverSuccess(true);
            setReceiverError(null);

            // Download
            triggerFileDownload(reassembled, activeHandshake.fileName, activeHandshake.mimeType);

            setDownloadTriggered(true);

            if (addToast) {
              addToast({
                type: 'success',
                message: 'File completely received & offline binary reconstruction triggered!',
                duration: 5000,
              });
            }
          } catch (err: any) {
            const errMsg = err?.message || 'Verification or reassembly failed.';
            setReceiverError(errMsg);
            setReceiverSuccess(false);
            setReassembledData(null);
            setDownloadTriggered(false);
            if (addToast) {
              addToast({
                type: 'error',
                message: errMsg,
                duration: 5000,
              });
            }
          } finally {
            terminateWorker();
            setCompilationStatus(null);
            setIsVerifying(false);
          }
        } else if (type === 'ERROR') {
          setReceiverError(error || 'Failed to compile binary content.');
          setReceiverSuccess(false);
          setReassembledData(null);
          if (addToast) {
            addToast({
              type: 'error',
              message: `Failed to compile binary content: ${error}`,
              duration: 5000,
            });
          }
          setDownloadTriggered(false);
          terminateWorker();
          setCompilationStatus(null);
          setIsVerifying(false);
        }
      };

      worker.onerror = (e) => {
        setReceiverError(e.message || 'Background worker error.');
        setReceiverSuccess(false);
        setReassembledData(null);
        if (addToast) {
          addToast({
            type: 'error',
            message: `Background worker error: ${e.message}`,
            duration: 5000,
          });
        }
        setDownloadTriggered(false);
        terminateWorker();
        setCompilationStatus(null);
        setIsVerifying(false);
      };

      worker.postMessage({
        type: 'START_REASSEMBLY',
        chunks: chunksToSend,
        totalChunks: total
      });

    } catch (err: any) {
      setReceiverError(err?.message || 'Verification or reassembly failed.');
      setReceiverSuccess(false);
      setReassembledData(null);
      if (addToast) {
        addToast({
          type: 'error',
          message: `Failed to start background compilation: ${err.message}`,
          duration: 5000,
        });
      }
      setDownloadTriggered(false);
      terminateWorker();
      setCompilationStatus(null);
      setIsVerifying(false);
    }
  }, [addToast, initWorker, terminateWorker]);

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
          hasShownMissingHandshakeToastRef.current = false;
          lookaheadRef.current = new StreamLookaheadReceiver({ mode: streamMode });
          handshakeRef.current = { fileName, fileSize, mimeType, sha256 };

          setChunks(new Map());
          setTotalChunks(null);
          setReceiverError(null);
          setReceiverSuccess(false);
          setDownloadTriggered(false);
          setReassembledData(null);
          setCompilationStatus(null);
          setIsVerifying(false);
          setHandshake({ fileName, fileSize, mimeType, sha256 });
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
              const next = new Map(prev);
              next.set(index, base64Data);
              return next;
            });
          }
        }
      }
    } catch (err: any) {
      setReceiverError(err?.message || 'An error occurred during scan decoding.');
    }
  }, [receiverSuccess, isVerifying, handshakeRequired, handshake, stopStream, streamMode, receiverError, addToast]);

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

  // Sync camera stream to video ref
  useEffect(() => {
    if (isScanning && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
      }
      startScanning();
    } else if (!isScanning) {
      stopScanning();
      flushVideoHardware();
    }
  }, [isScanning, stream, startScanning, stopScanning, flushVideoHardware]);

  // Start / Stop sessions
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

  // Completion checking effect (without handshake requirement or with completed handshake)
  useEffect(() => {
    if (totalChunks !== null && chunks.size === totalChunks && !downloadTriggered) {
      if (autoDownload) {
        setDownloadTriggered(true);
        stopCameraSession();
        reconstructAndValidateFile(chunks, totalChunks, handshake || handshakeRef.current || undefined);
      } else {
        if (isScanning) {
          stopCameraSession();
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
  }, [chunks, totalChunks, downloadTriggered, handshake, reconstructAndValidateFile, stopCameraSession, autoDownload, isScanning, addToast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanning();
      stopStream();
      flushVideoHardware();
      terminateWorker();
    };
  }, [stopScanning, stopStream, terminateWorker, flushVideoHardware]);

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
  };
}
