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

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Square, Camera, AlertTriangle, Activity, Cpu, Sun, Moon, QrCode, ArrowLeft, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/components/ui/Toast';
import { useCamera } from '@/hooks/useCamera';
import { useAdaptiveScanner } from '@/hooks/useAdaptiveScanner';
import { StreamLookaheadReceiver, DANGEROUS_SCHEMES } from '@/engine/StreamLookahead';
import { QRProvider } from '@/context/QRContext';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';

/**
 * Helper to convert Base64 back into Uint8Array for binary reconstruction.
 * @param base64 - The input base64 string to convert.
 * @returns The reconstructed binary Uint8Array.
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function FileTransferReceiveInner() {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { addToast } = useToast();

  const [streamMode, setStreamMode] = useState<'text' | 'binary'>('text');
  const [chunks, setChunks] = useState<Map<number, string>>(new Map());
  const [totalChunks, setTotalChunks] = useState<number | null>(null);
  const [securityAlert, setSecurityAlert] = useState<string | null>(null);
  const [downloadTriggered, setDownloadTriggered] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lookaheadRef = useRef<StreamLookaheadReceiver | null>(null);

  // Initialize camera hook
  const {
    startStream,
    stopStream,
    stream,
  } = useCamera();

  // Reset/Clear everything to initial state
  const handleClear = useCallback(() => {
    setChunks(new Map());
    setTotalChunks(null);
    setSecurityAlert(null);
    setDownloadTriggered(false);
    lookaheadRef.current = new StreamLookaheadReceiver({ mode: streamMode });
    addToast({
      type: 'info',
      message: 'Receiver state has been reset.',
      duration: 3000,
    });
  }, [addToast, streamMode]);

  // Handle incoming frame data
  const handleFrame = useCallback((decodedText: string) => {
    if (!decodedText) return;

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

    // 3. Process file transfer protocol
    if (decodedText.startsWith('F|')) {
      const parts = decodedText.split('|');
      if (parts.length === 4) {
        const index = parseInt(parts[1], 10);
        const total = parseInt(parts[2], 10);
        const base64Data = parts[3];

        if (!isNaN(index) && !isNaN(total)) {
          setChunks(prev => {
            if (prev.has(index)) return prev; // Already received
            const next = new Map(prev);
            next.set(index, base64Data);
            return next;
          });
          setTotalChunks(total);
        }
      }
    }
  }, [stopStream, streamMode]);

  // Initialize Adaptive Scanner hook
  const { startScanning, stopScanning } = useAdaptiveScanner({
    videoRef,
    onScanSuccess: (data) => {
      handleFrame(data);
    },
    onScanFail: () => {
      // Expected scan frame decode failures on standard camera stream frames
    },
  });

  // Effect to attach stream to video element when stream or isScanning changes
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

  // Toggle active camera scanning session
  const startCameraSession = useCallback(async () => {
    setSecurityAlert(null);
    const activeStream = await startStream();
    if (activeStream) {
      setIsScanning(true);
      addToast({
        type: 'success',
        message: 'Camera scanner activated.',
        duration: 3000,
      });
    }
  }, [startStream, addToast]);

  const stopCameraSession = useCallback(() => {
    setIsScanning(false);
    stopStream();
    addToast({
      type: 'info',
      message: 'Camera scanner deactivated.',
      duration: 3000,
    });
  }, [stopStream, addToast]);

  // Auto-trigger reconstruction & download when file frames complete
  useEffect(() => {
    if (totalChunks !== null && chunks.size === totalChunks && !downloadTriggered) {
      setDownloadTriggered(true);
      stopCameraSession();

      try {
        const uint8Arrays: Uint8Array[] = [];
        for (let i = 0; i < totalChunks; i++) {
          const base64 = chunks.get(i);
          if (base64) {
            uint8Arrays.push(base64ToUint8Array(base64));
          } else {
            // Gap detected, reset flag
            setDownloadTriggered(false);
            return;
          }
        }

        const fileBlob = new Blob(uint8Arrays, { type: 'application/octet-stream' });
        const url = URL.createObjectURL(fileBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `received_file_${Date.now()}.bin`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        addToast({
          type: 'success',
          message: 'File completely received & offline binary reconstruction triggered!',
          duration: 5000,
        });
      } catch (err: any) {
        addToast({
          type: 'error',
          message: `Failed to compile binary content: ${err.message}`,
          duration: 5000,
        });
        setDownloadTriggered(false);
      }
    }
  }, [chunks, totalChunks, downloadTriggered, stopCameraSession, addToast]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopScanning();
      stopStream();
    };
  }, [stopScanning, stopStream]);

  // Simulation controls
  const simulateOutOfOrder = () => {
    handleClear();
    const message = "Congratulations! Out-of-order packet reassembly and recovery is working flawlessly!";
    const total = 10;
    const size = Math.ceil(message.length / total);
    const simulatedFrames: string[] = [];

    for (let i = 0; i < total; i++) {
      const chunkText = message.slice(i * size, (i + 1) * size);
      const base64 = btoa(chunkText);
      simulatedFrames.push(`F|${i}|${total}|${base64}`);
    }

    // Sequence: 1-5 (indices 0-4), then 8-10 (indices 7-9), then 6-7 (indices 5-6)
    const scanOrder = [0, 1, 2, 3, 4, 7, 8, 9, 5, 6];
    let delay = 0;
    scanOrder.forEach((idx) => {
      setTimeout(() => {
        handleFrame(simulatedFrames[idx]);
      }, delay);
      delay += 100;
    });
  };

  const simulateRestrictedSchema = () => {
    handleFrame("javascript:alert('malicious')");
  };

  const simulateSplitRestricted = () => {
    handleClear();
    setTimeout(() => {
      handleFrame("java");
    }, 0);
    setTimeout(() => {
      handleFrame("script:alert('malicious')");
    }, 100);
  };

  // Re-calculate statistics
  const receivedCount = chunks.size;
  const progressPercent = totalChunks ? Math.round((receivedCount / totalChunks) * 100) : 0;

  return (
    <div className={`${isDarkMode ? 'dark' : ''} min-h-screen w-full`}>
      <div className="relative flex h-screen min-h-screen flex-col-reverse overflow-hidden bg-slate-50 transition-colors duration-300 md:h-auto md:min-h-0 md:flex-row md:overflow-visible dark:bg-slate-950">
        
        {/* Left Stats & controls Sidebar */}
        <aside aria-label="Receiver Settings and Controls" className="relative z-10 flex max-h-[50vh] w-full flex-col overflow-y-auto border-r border-slate-200 bg-white shadow-xl transition-colors duration-300 md:max-h-none md:w-120 dark:border-slate-800 dark:bg-slate-900">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-100 bg-white p-6 transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900">
            <div>
              <a href="/" aria-label="Home" className="mb-1 flex items-center gap-2 text-teal-700 transition-opacity hover:opacity-80 dark:text-teal-400">
                <QrCode className="size-6" />
                <h1 className="text-xl font-bold tracking-tight text-slate-700 dark:text-slate-100">QRCraftly</h1>
              </a>
              <p className="text-sm text-slate-600 dark:text-slate-400">High-Performance File Receiver</p>
            </div>
            <div className="flex gap-2">
              <a
                href="/file-transfer"
                className="flex items-center gap-1 rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                title="Back to Sender"
                aria-label="Back to File Sender"
              >
                <ArrowLeft className="size-5" />
              </a>
              <Button
                variant="icon"
                size="icon"
                onClick={toggleDarkMode}
                className="rounded-full"
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDarkMode ? <Sun className="size-5" /> : <Moon className="size-5" />}
              </Button>
            </div>
          </header>

          <div className="space-y-8 p-6 pb-24">
            
            {/* Connection / Status Section */}
            <section className="space-y-4">
              <h2 className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-600 uppercase dark:text-slate-400">
                <Camera className="size-4 text-teal-600" />
                1. Stream Receiver State
              </h2>

              <div className="flex flex-col gap-3">
                {securityAlert && (
                  <div className="animate-bounce">
                    <Alert variant="error" title="Security Intercepted">
                      {securityAlert}
                    </Alert>
                  </div>
                )}

                <div className="flex gap-3">
                  {!isScanning ? (
                    <Button
                      variant="primary"
                      fullWidth
                      onClick={startCameraSession}
                      aria-label="Activate camera scanner"
                    >
                      <Play className="size-4" />
                      Activate Camera Scanner
                    </Button>
                  ) : (
                    <Button
                      variant="error"
                      fullWidth
                      onClick={stopCameraSession}
                      aria-label="Deactivate camera scanner"
                    >
                      <Square className="size-4" />
                      Deactivate Scanner
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={handleClear}
                    title="Reset all buffers"
                    aria-label="Reset all buffers"
                    className="px-3"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                {/* Stream Mode Selection Control */}
                <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800/60 dark:bg-slate-900/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <label htmlFor="stream-mode-switch" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        Binary Transfer Mode
                      </label>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {streamMode === 'binary'
                          ? 'Bypasses recursive sanitization checks'
                          : 'Enforces full security validation'}
                      </p>
                    </div>
                    <ToggleSwitch
                      id="stream-mode-switch"
                      label="Binary Mode"
                      srLabel={true}
                      checked={streamMode === 'binary'}
                      onChange={(checked) => {
                        const newMode = checked ? 'binary' : 'text';
                        setStreamMode(newMode);
                        lookaheadRef.current = new StreamLookaheadReceiver({ mode: newMode });
                        addToast({
                          type: 'info',
                          message: `Switched stream mode to ${newMode === 'binary' ? 'Binary' : 'Text'}`,
                          duration: 3000,
                        });
                      }}
                    />
                  </div>
                </div>
              </div>
            </section>

            <div className="h-px bg-slate-100 dark:bg-slate-800" />

            {/* Live Progress Metrics */}
            <section className="space-y-4">
              <h2 className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-600 uppercase dark:text-slate-400">
                <Activity className="size-4 text-teal-600" />
                2. Live Progress & Assembly
              </h2>

              {totalChunks !== null ? (
                <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-xs dark:border-slate-900 dark:bg-slate-900/40">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-500">Progress:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{progressPercent}%</span>
                  </div>
                  
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div className="h-full bg-teal-600 transition-all duration-150" style={{ width: `${progressPercent}%` }} />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <div className="text-slate-400">Received</div>
                      <div className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {receivedCount} / {totalChunks} chunks
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">Buffered Frames</div>
                      <div className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {chunks.size}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="mb-2 font-semibold text-slate-500">Frame Completion Grid:</div>
                    <div className="mx-auto grid max-w-sm grid-cols-5 gap-2" data-testid="progress-grid">
                      {Array.from({ length: totalChunks }).map((_, idx) => {
                        const isReceived = chunks.has(idx);
                        return (
                          <div
                            key={idx}
                            data-testid={`chunk-block-${idx}`}
                            data-received={isReceived}
                            className={`flex size-10 items-center justify-center rounded-lg border font-mono text-xs font-bold transition-all ${
                              isReceived
                                ? 'border-emerald-500 bg-emerald-500 text-white'
                                : 'border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900'
                            }`}
                            title={`Chunk ${idx + 1}: ${isReceived ? 'Received' : 'Missing'}`}
                          >
                            {idx + 1}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400 dark:border-slate-800">
                  Ready to scan. Please stream or simulate an animated QR file transfer.
                </div>
              )}
            </section>

            <div className="h-px bg-slate-100 dark:bg-slate-800" />

            {/* Quick Testing Simulation Controls */}
            <section className="space-y-4">
              <h2 className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-600 uppercase dark:text-slate-400">
                <Cpu className="size-4 text-teal-600" />
                3. Simulation & Validation Testing
              </h2>

              <div className="grid grid-cols-1 gap-2">
                <Button
                  variant="outline"
                  onClick={simulateOutOfOrder}
                  className="justify-start text-left text-xs"
                >
                  <Activity className="mr-2 size-4 text-teal-600" />
                  Simulate Out-of-Order (10 blocks)
                </Button>
                <Button
                  variant="outline"
                  onClick={simulateRestrictedSchema}
                  className="justify-start text-left text-xs text-amber-600 dark:text-amber-400"
                >
                  <AlertTriangle className="mr-2 size-4" />
                  Simulate Dangerous Scheme (javascript:)
                </Button>
                <Button
                  variant="outline"
                  onClick={simulateSplitRestricted}
                  className="justify-start text-left text-xs text-red-600 dark:text-red-400"
                >
                  <AlertTriangle className="mr-2 size-4" />
                  Simulate Split Threat (java + script:)
                </Button>
              </div>
            </section>

          </div>
        </aside>

        {/* Right Active Webcam Viewport */}
        <section aria-label="Camera Capture Viewport" className="relative flex max-h-[50vh] flex-1 flex-col items-center justify-center overflow-x-hidden overflow-y-auto bg-slate-50 p-4 transition-colors duration-300 md:sticky md:top-0 md:h-[100dvh] md:max-h-none md:p-8 dark:bg-slate-950">
          
          {/* Background Decorative Glow */}
          <div className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-20">
            <div className="absolute top-0 left-0 size-96 -translate-1/2 rounded-full bg-teal-200 blur-3xl transition-colors duration-300 dark:bg-teal-900"></div>
            <div className="absolute right-0 bottom-0 size-96 translate-1/2 rounded-full bg-slate-300 blur-3xl transition-colors duration-300 dark:bg-slate-800"></div>
          </div>

          <div className="relative z-10 w-full max-w-md">
            <Card className="hover:scale-1.01 transform overflow-hidden transition-all duration-300">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="font-semibold text-slate-700 dark:text-slate-200">Camera Viewport</h2>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-bold ${
                    isScanning 
                      ? 'border border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' 
                      : 'border border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400'
                  }`}>
                    <span className={`size-1.5 rounded-full ${isScanning ? 'animate-pulse bg-emerald-500' : 'bg-slate-400'}`} />
                    {isScanning ? 'Active Scanning' : 'Idle'}
                  </span>
                </div>
              </div>

              {/* Video frame box with targeting guide */}
              <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-slate-100 bg-slate-950 p-0 dark:border-slate-900">
                {isScanning ? (
                  <video
                    ref={videoRef}
                    className="size-full object-cover"
                    playsInline
                    muted
                  />
                ) : (
                  <div className="flex size-full flex-col items-center justify-center gap-3 text-slate-400">
                    <Camera className="size-12 opacity-40" />
                    <p className="text-sm">Camera inactive</p>
                  </div>
                )}

                {/* Target Frame Overlay */}
                {isScanning && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="relative size-64 rounded-3xl border-2 border-dashed border-teal-500/80 bg-transparent shadow-[0_0_0_100vmax_rgba(0,0,0,0.6)]">
                      <div className="absolute top-0 left-0 size-6 -translate-1 rounded-tl-lg border-t-4 border-l-4 border-teal-400" />
                      <div className="absolute top-0 right-0 size-6 translate-x-1 -translate-y-1 rounded-tr-lg border-t-4 border-r-4 border-teal-400" />
                      <div className="absolute bottom-0 left-0 size-6 -translate-x-1 translate-y-1 rounded-bl-lg border-b-4 border-l-4 border-teal-400" />
                      <div className="absolute right-0 bottom-0 size-6 translate-1 rounded-br-lg border-r-4 border-b-4 border-teal-400" />
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 text-center text-xs leading-relaxed text-slate-400">
                Position the streaming QR code directly inside the target frame. Ensure adequate lighting and avoid glares for optimal scanning speed.
              </div>
            </Card>
          </div>
        </section>

      </div>
    </div>
  );
}

/**
 * The main entry point for the Mobile File Transfer Receive Page.
 * Renders the stateful inner component inside the standard QR provider context.
 * @returns The Page component.
 */
export default function Page() {
  return (
    <QRProvider>
      <FileTransferReceiveInner />
    </QRProvider>
  );
}
