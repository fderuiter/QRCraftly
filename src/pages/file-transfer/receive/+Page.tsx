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

import React, { useState, useCallback, useRef } from 'react';
import { createFountainSession } from '@/packages/optical-transfer';
import { Play, Square, Camera, AlertTriangle, Activity, Cpu, Trash2, CheckCircle2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { ToolWorkspaceLayout, ToolWorkspaceHeader } from '@/components/ToolWorkspaceLayout';
import { useToast } from '@/components/ui/Toast';
import { useAnimatedQrReceiver } from '@/hooks/useAnimatedQrReceiver';
import { QRProvider } from '@/context/QRContext';

/**
 * Formats an ETA in seconds for the telemetry panel.
 * @param seconds Estimated seconds remaining, or null when unknown.
 * @returns A short human-readable duration.
 */
function formatEta(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return '--';
  if (seconds < 1) return '<1 s';
  if (seconds < 60) return `${Math.ceil(seconds)} s`;
  return `${Math.floor(seconds / 60)} min ${Math.ceil(seconds % 60)} s`;
}

function FileTransferReceiveInner() {
  const { addToast } = useToast();

  const [isDragging, setIsDragging] = useState(false);
  const [showBetaAlert, setShowBetaAlert] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Use the unified animated QR receiver hook
  const {
    chunks,
    totalChunks,
    securityAlert,
    receiverError,
    isScanning,
    videoRef,
    handleClear,
    handleFrame,
    startCameraSession,
    stopCameraSession,
    downloadTriggered,
    reconstructAndValidateFile,
    handshake,
    compilationStatus,
    fountainStats,
    receiverSuccess,
    receiverMode,
    setReceiverMode,
    videoFile,
    fileValidationError,
    handleFileUpload,
  } = useAnimatedQrReceiver({
    addToast,
    // Legacy F| chunks still need an H| handshake; fountain droplets carry their own verified session header.
    handshakeRequired: true,
    autoDownload: false,
  });

  const isFountainComplete = fountainStats !== null && receiverSuccess;
  const isComplete = isFountainComplete || (totalChunks !== null && chunks.size === totalChunks);

  // Drag and drop handlers for video file upload
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
    if (e.target) {
      e.target.value = '';
    }
  }, [handleFileUpload]);

  // Handle manual compile and download on user click
  const handleManualDownload = useCallback(() => {
    if (!isComplete) return;
    reconstructAndValidateFile(chunks, totalChunks ?? undefined, handshake || undefined);
  }, [chunks, totalChunks, handshake, isComplete, reconstructAndValidateFile]);
  // Simulation controls
  const simulateOutOfOrder = () => {
    handleClear();
    const message = "Congratulations! Out-of-order packet reassembly and recovery is working flawlessly!";
    const total = 10;
    const size = Math.ceil(message.length / total);
    const simulatedFrames: string[] = [];

    const sha256 = "c67d1359e2dbf94943e81f0e0d9edbc3614e6bc3ec2bec04f527ed4c3f845886";
    handleFrame(`H|simulated_file.txt|${message.length}|text/plain|${sha256}`);

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

  // Rateless fountain stream joined mid-stream with ~30% of frames dropped.
  const simulateFountainStream = async () => {
    handleClear();
    const text = 'Fountain-coded air-gapped transfer: join at any frame, lose any frame. '.repeat(8);
    const { encoder } = await createFountainSession(new TextEncoder().encode(text), {
      fileName: 'fountain_demo.txt',
      mimeType: 'text/plain',
    });
    let delay = 0;
    for (let index = 7; index < encoder.k * 4; index++) {
      if (index % 10 < 3) continue;
      const droplet = encoder.dropletStringForIndex(index);
      setTimeout(() => handleFrame(droplet), delay);
      delay += 20;
    }
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
  const fountainPercent = fountainStats && fountainStats.k > 0 ? Math.round((fountainStats.rank / fountainStats.k) * 100) : 0;

  return (
    <div className="w-full">
      <ToolWorkspaceLayout
        controlsLabel="Receiver Settings and Controls"
        previewLabel="Camera Capture Viewport"
        previewId="receiver-viewport"
        header={
          <ToolWorkspaceHeader
            title="Receive a File by QR Code"
            subtitle="Scan an animated transfer QR with your camera or a video."
            badge="Beta"
            previewId="receiver-viewport"
            previewJumpLabel="Jump to camera"
          />
        }
        controls={
          <>
            {/* Connection / Status Section */}
            <section className="space-y-4">
              <h2 className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-600 uppercase dark:text-slate-400">
                <Camera className="size-4 text-teal-600" />
                1. Scan Transfer QR
              </h2>

              {/* Dual-Mode Pill Switcher */}
              <div
                className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80"
                role="group"
                aria-label="Receiver Input Mode"
              >
                <Button
                  variant="outline"
                  size="sm"
                  pressed={receiverMode === 'camera'}
                  onClick={() => setReceiverMode('camera')}
                  className="min-h-11 gap-2 text-xs font-semibold"
                >
                  <Camera className="size-4" aria-hidden="true" />
                  Camera Feed
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  pressed={receiverMode === 'file'}
                  onClick={() => setReceiverMode('file')}
                  className="min-h-11 gap-2 text-xs font-semibold"
                >
                  <Upload className="size-4" aria-hidden="true" />
                  Video File
                </Button>
              </div>

              <div className="flex flex-col gap-3">
                {securityAlert && (
                  <div>
                    <Alert variant="error" title="Security Intercepted">
                      {securityAlert}
                    </Alert>
                  </div>
                )}

                {receiverError && (
                  <div data-testid="receiver-error">
                    <Alert variant="error" title="Transfer Error">
                      {receiverError}
                    </Alert>
                  </div>
                )}

                {fileValidationError && (
                  <div data-testid="file-validation-error">
                    <Alert variant="error" title="Invalid File">
                      {fileValidationError}
                    </Alert>
                  </div>
                )}

                {receiverMode === 'camera' ? (
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
                      title="Clear transfer progress"
                      aria-label="Clear transfer progress"
                      className="px-3"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          fileInputRef.current?.click();
                        }
                      }}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition-colors ${
                        isDragging
                          ? 'border-teal-500 bg-teal-50/50 dark:border-teal-400 dark:bg-teal-950/30'
                          : 'border-slate-200 hover:border-teal-500 dark:border-slate-800 dark:hover:border-teal-400'
                      }`}
                      data-testid="sidebar-dropzone"
                    >
                      <Upload className="mb-2 size-6 text-teal-600 dark:text-teal-400" />
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {videoFile ? videoFile.name : 'Drop video file here or click to browse'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {videoFile ? `${(videoFile.size / (1024 * 1024)).toFixed(2)} MB` : 'MP4, WebM, MOV, etc.'}
                      </p>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="video/*"
                        onChange={handleFileInputChange}
                        className="hidden"
                        data-testid="video-file-input"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        fullWidth
                        onClick={() => fileInputRef.current?.click()}
                        aria-label="Select Video File"
                      >
                        <Upload className="size-4" />
                        {videoFile ? 'Replace Video' : 'Select Video File'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleClear}
                        title="Clear transfer progress"
                        aria-label="Clear transfer progress"
                        className="px-3"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                )}

              </div>
            </section>

            {/* Beta notice after the primary actions so they stay in the first mobile viewport. */}
            {showBetaAlert && (
              <Alert
                variant="info"
                role="note"
                onDismiss={() => setShowBetaAlert(false)}
              >
                <span className="font-semibold">Beta Feature:</span> Air-gapped file transfer streams binary data across screen and camera. For optimal transmission, ensure consistent lighting, minimize display glare, and keep devices steady.
              </Alert>
            )}
          </>
        }
        secondary={
          <>
            {/* Live Progress Metrics */}
            <section className="space-y-4">
              <h2 className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-600 uppercase dark:text-slate-400">
                <Activity className="size-4 text-teal-600" />
                2. Transfer Progress
              </h2>

              {compilationStatus && (
                <div className="flex animate-pulse items-center gap-2 rounded-xl border border-teal-100 bg-teal-50/50 p-4 text-xs text-teal-800 dark:border-teal-900/60 dark:bg-teal-950/20 dark:text-teal-400" data-testid="compilation-status">
                  <Cpu className="size-4 animate-spin text-teal-600" />
                  <span className="font-semibold">{compilationStatus}</span>
                </div>
              )}

              {fountainStats ? (
                <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-xs dark:border-slate-900 dark:bg-slate-900/40" data-testid="fountain-telemetry">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-500">Decoded:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{fountainPercent}%</span>
                  </div>

                  <div
                    className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
                    role="progressbar"
                    aria-label="Decoding rank"
                    aria-valuemin={0}
                    aria-valuemax={fountainStats.k}
                    aria-valuenow={fountainStats.rank}
                  >
                    <div className="h-full bg-teal-600 transition-all duration-150" style={{ width: `${fountainPercent}%` }} />
                  </div>

                  <dl className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <dt className="text-slate-500 dark:text-slate-400">Droplets received</dt>
                      <dd className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300" data-testid="fountain-droplets">
                        {fountainStats.dropletsReceived} / {fountainStats.k}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500 dark:text-slate-400">Decoding rank</dt>
                      <dd className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300" data-testid="fountain-rank">
                        {fountainStats.rank} / {fountainStats.k}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500 dark:text-slate-400">Scan rate</dt>
                      <dd className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300" data-testid="fountain-fps">
                        {fountainStats.fps.toFixed(1)} fps
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500 dark:text-slate-400">Time left</dt>
                      <dd className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300" data-testid="fountain-eta">
                        {formatEta(fountainStats.etaSeconds)}
                      </dd>
                    </div>
                  </dl>
                </div>
              ) : totalChunks !== null ? (
                <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-xs dark:border-slate-900 dark:bg-slate-900/40" data-testid="legacy-progress">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-500">Progress:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{progressPercent}%</span>
                  </div>

                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div className="h-full bg-teal-600 transition-all duration-150" style={{ width: `${progressPercent}%` }} />
                  </div>

                  <div className="pt-2">
                    <div className="text-slate-500 dark:text-slate-400">Received</div>
                    <div className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {receivedCount} / {totalChunks} parts
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400 dark:border-slate-800">
                  Ready to scan. Start an animated QR file transfer from the sender.
                </div>
              )}
            </section>

            {import.meta.env.DEV && (
              <>
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
                      onClick={simulateFountainStream}
                      className="justify-start text-left text-xs"
                    >
                      <Activity className="mr-2 size-4 text-teal-600" />
                      Simulate Fountain Stream (mid-stream, 30% loss)
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
              </>
            )}

          </>
        }
        preview={
            <Card className="overflow-hidden">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="font-semibold text-slate-700 dark:text-slate-200">
                  {receiverMode === 'camera' ? 'Camera Viewport' : 'Video Viewport'}
                </h2>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-bold ${
                    isScanning 
                      ? 'border border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' 
                      : 'border border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400'
                  }`}>
                    <span aria-hidden="true" className={`size-1.5 rounded-full ${isScanning ? 'bg-emerald-500 motion-safe:animate-pulse' : 'bg-slate-400'}`} />
                    {isScanning ? 'Active Scanning' : 'Idle'}
                  </span>
                </div>
              </div>

              {/* Video frame box with targeting guide or dropzone */}
              <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-slate-100 bg-slate-950 p-0 dark:border-slate-900">
                {isComplete ? (
                  <div className="flex size-full flex-col items-center justify-center gap-4 bg-slate-900 p-6 text-center text-slate-100 dark:bg-slate-950" data-testid="inline-complete-panel">
                    <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-400">
                      <CheckCircle2 className="size-12" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-100">Transfer Complete</h3>
                      <p className="mt-1 text-xs text-slate-400">
                        {isFountainComplete
                          ? `${handshake?.fileName ?? 'File'} was rebuilt and its SHA-256 checksum verified. It is ready to download.`
                          : `All ${totalChunks} parts were received. Your file is ready to download.`}
                      </p>
                    </div>
                    <Button
                      variant={downloadTriggered ? "outline" : "primary"}
                      onClick={handleManualDownload}
                      className="mt-2 font-semibold shadow-lg shadow-teal-500/20 hover:shadow-teal-500/35"
                      aria-label={downloadTriggered ? "Download Again" : "Download File"}
                    >
                      {downloadTriggered ? "Download Again" : "Download File"}
                    </Button>
                  </div>
                ) : isScanning || (receiverMode === 'file' && videoFile) ? (
                  <video
                    ref={videoRef}
                    className="size-full object-cover"
                    playsInline
                    muted
                    loop
                  />
                ) : receiverMode === 'file' ? (
                  <div
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex size-full cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed p-6 text-center transition-colors ${
                      isDragging
                        ? 'border-teal-500 bg-teal-950/40 text-teal-300'
                        : 'border-slate-800 text-slate-400 hover:border-teal-500 hover:text-slate-300'
                    }`}
                    data-testid="viewport-dropzone"
                  >
                    <Upload className="size-12 text-teal-500 opacity-50" />
                    <div>
                      <p className="text-sm font-semibold text-slate-200">Drop pre-recorded video here</p>
                      <p className="mt-1 text-xs text-slate-400">or click to browse video files (MP4, WebM)</p>
                    </div>
                  </div>
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
                Position the transfer QR inside the guide. Use good lighting and avoid glare for faster scanning.
              </div>
            </Card>
        }
      />
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
