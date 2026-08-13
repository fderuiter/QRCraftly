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
import { base64ToUint8Array } from '../utils/base64';
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
}

/**
 * Unified React hook to handle camera streams, adaptive scanning, chunk tracking,
 * and sequential data reassembly for receiving.
 * @param root0
 * @param root0.addToast
 * @param root0.handshakeRequired
 * @param root0.streamMode
 */
export function useAnimatedQrReceiver({
  addToast,
  handshakeRequired = false,
  streamMode = 'text',
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

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lookaheadRef = useRef<StreamLookaheadReceiver | null>(null);

  // Sync lookahead receiver configuration with streamMode option
  useEffect(() => {
    lookaheadRef.current = new StreamLookaheadReceiver({ mode: streamMode });
  }, [streamMode]);

  // useCamera hook
  const camera = useCamera();
  const { startStream, stopStream, stream } = camera;

  // Reset/Clear state
  const handleClear = useCallback(() => {
    setChunks(new Map());
    setTotalChunks(null);
    setHandshake(null);
    setSecurityAlert(null);
    setReceiverError(null);
    setReceiverSuccess(false);
    setIsVerifying(false);
    setDownloadTriggered(false);
    setReassembledData(null);
    lookaheadRef.current = new StreamLookaheadReceiver({ mode: streamMode });
    if (addToast) {
      addToast({
        type: 'info',
        message: 'Receiver state has been reset.',
        duration: 3000,
      });
    }
  }, [addToast, streamMode]);

  // Reassemble and validate file
  const reconstructAndValidateFile = useCallback(async (
    activeChunks: Map<number, string>,
    total: number,
    activeHandshake?: HandshakeInfo
  ) => {
    try {
      setIsVerifying(true);
      const uint8Arrays: Uint8Array[] = [];
      for (let i = 0; i < total; i++) {
        const chunkBase64 = activeChunks.get(i);
        if (!chunkBase64) {
          throw new Error(`Missing frame chunk at index ${i}`);
        }
        const arr = base64ToUint8Array(chunkBase64);
        uint8Arrays.push(arr);
      }

      // Concatenate arrays
      let totalLength = uint8Arrays.reduce((acc, arr) => acc + arr.length, 0);
      const reassembled = new Uint8Array(totalLength);
      let offset = 0;
      for (const arr of uint8Arrays) {
        reassembled.set(arr, offset);
        offset += arr.length;
      }

      if (activeHandshake) {
        // Compute and verify SHA-256
        const hashBuffer = await crypto.subtle.digest('SHA-256', reassembled.buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const actualSHA256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        if (actualSHA256 !== activeHandshake.sha256) {
          throw new Error(`Integrity validation failed! SHA-256 hash does not match handshake value.\nExpected: ${activeHandshake.sha256}\nActual: ${actualSHA256}`);
        }

        setReassembledData(reassembled);
        setReceiverSuccess(true);
        setReceiverError(null);

        // Download
        triggerFileDownload(reassembled, activeHandshake.fileName, activeHandshake.mimeType);
      } else {
        // Standard flow without handshake (e.g. receive page)
        setReassembledData(reassembled);
        setReceiverSuccess(true);
        setReceiverError(null);

        triggerFileDownload(reassembled, `received_file_${Date.now()}.bin`, 'application/octet-stream');
      }

      if (addToast) {
        addToast({
          type: 'success',
          message: 'File completely received & offline binary reconstruction triggered!',
          duration: 5000,
        });
      }
    } catch (err: any) {
      setReceiverError(err?.message || 'Verification or reassembly failed.');
      setReceiverSuccess(false);
      setReassembledData(null);
      if (addToast) {
        addToast({
          type: 'error',
          message: `Failed to compile binary content: ${err.message}`,
          duration: 5000,
        });
      }
    } finally {
      setIsVerifying(false);
    }
  }, [addToast]);

  // Frame processor
  const handleFrame = useCallback(async (decodedText: string) => {
    if (!decodedText || receiverSuccess || isVerifying) return;

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
      lookaheadRef.current.receive(decodedText);
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

        setHandshake(prev => {
          if (prev && prev.sha256 === sha256) return prev;
          setChunks(new Map());
          setTotalChunks(null);
          setReceiverError(null);
          setReceiverSuccess(false);
          setDownloadTriggered(false);
          setReassembledData(null);
          return { fileName, fileSize, mimeType, sha256 };
        });
      } else if (decodedText.startsWith('F|')) {
        const parts = decodedText.split('|');
        if (parts.length === 4) {
          const index = parseInt(parts[1], 10);
          const total = parseInt(parts[2], 10);
          const base64Data = parts[3];

          if (!isNaN(index) && !isNaN(total)) {
            if (handshakeRequired && !handshake) {
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
  }, [receiverSuccess, isVerifying, handshakeRequired, handshake, stopStream, streamMode]);

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
    }
  }, [isScanning, stream, startScanning, stopScanning]);

  // Start / Stop sessions
  const startCameraSession = useCallback(async () => {
    setSecurityAlert(null);
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
  }, [startStream, addToast]);

  const stopCameraSession = useCallback(() => {
    setIsScanning(false);
    stopStream();
    if (addToast) {
      addToast({
        type: 'info',
        message: 'Camera scanner deactivated.',
        duration: 3000,
      });
    }
  }, [stopStream, addToast]);

  // Completion checking effect (without handshake requirement or with completed handshake)
  useEffect(() => {
    if (totalChunks !== null && chunks.size === totalChunks && !downloadTriggered) {
      setDownloadTriggered(true);
      stopCameraSession();
      reconstructAndValidateFile(chunks, totalChunks, handshake || undefined);
    }
  }, [chunks, totalChunks, downloadTriggered, handshake, reconstructAndValidateFile, stopCameraSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanning();
      stopStream();
    };
  }, [stopScanning, stopStream]);

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
  };
}
