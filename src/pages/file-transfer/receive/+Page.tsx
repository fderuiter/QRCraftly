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
import { Play, Square, Camera, AlertTriangle, Activity, Cpu, Sun, Moon, QrCode, ArrowLeft, Trash2, CheckCircle2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/components/ui/Toast';
import { useAnimatedQrReceiver } from '@/hooks/useAnimatedQrReceiver';
import { QRProvider } from '@/context/QRContext';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';

function FileTransferReceiveInner() {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { addToast } = useToast();

  const [streamMode, setStreamMode] = useState<'text' | 'binary'>('text');
  const [isDragging, setIsDragging] = useState(false);
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
    receiverMode,
    setReceiverMode,
    videoFile,
    fileValidationError,
    handleFileUpload,
  } = useAnimatedQrReceiver({
    addToast,
    handshakeRequired: true,
    streamMode,
    autoDownload: false,
  });

  const isComplete = totalChunks !== null && chunks.size === totalChunks;

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
    reconstructAndValidateFile(chunks, totalChunks, handshake || undefined);
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
              <p className="text-sm text-slate-600 dark:text-slate-400">Receive a File by QR Code</p>
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
                1. Scan Transfer QR
              </h2>

              {/* Dual-Mode Pill Switcher */}
              <div
                className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80"
                role="radiogroup"
                aria-label="Receiver Input Mode"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={receiverMode === 'camera'}
                  onClick={() => setReceiverMode('camera')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all ${
                    receiverMode === 'camera'
                      ? 'bg-white text-teal-700 shadow-sm dark:bg-slate-900 dark:text-teal-400'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <Camera className="size-4" />
                  Camera Feed
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={receiverMode === 'file'}
                  onClick={() => setReceiverMode('file')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all ${
                    receiverMode === 'file'
                      ? 'bg-white text-teal-700 shadow-sm dark:bg-slate-900 dark:text-teal-400'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <Upload className="size-4" />
                  Video File
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {securityAlert && (
                  <div className="animate-bounce">
                    <Alert variant="error" title="Security Intercepted">
                      {securityAlert}
                    </Alert>
                  </div>
                )}

                {receiverError && (
                  <div className="animate-bounce" data-testid="receiver-error">
                    <Alert variant="error" title="Transfer Error">
                      {receiverError}
                    </Alert>
                  </div>
                )}

                {fileValidationError && (
                  <div className="animate-bounce" data-testid="file-validation-error">
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
                      <p className="text-2xs mt-1 text-slate-500 dark:text-slate-400">
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

                {/* Stream Mode Selection Control */}
                <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800/60 dark:bg-slate-900/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <label htmlFor="stream-mode-switch" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        Compatibility mode
                      </label>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {streamMode === 'binary'
                          ? 'Accepts all file data, but skips checks that block potentially unsafe text content.'
                          : 'Checks text content for potentially unsafe links and commands.'}
                      </p>
                    </div>
                    <ToggleSwitch
                      id="stream-mode-switch"
                      label="Compatibility mode"
                      srLabel={true}
                      checked={streamMode === 'binary'}
                      onChange={(checked) => {
                        const newMode = checked ? 'binary' : 'text';
                        setStreamMode(newMode);
                        addToast({
                          type: 'info',
                          message: `Compatibility mode ${newMode === 'binary' ? 'enabled' : 'disabled'}`,
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
                2. Transfer Progress
              </h2>

              {compilationStatus && (
                <div className="flex animate-pulse items-center gap-2 rounded-xl border border-teal-100 bg-teal-50/50 p-4 text-xs text-teal-800 dark:border-teal-900/60 dark:bg-teal-950/20 dark:text-teal-400" data-testid="compilation-status">
                  <Cpu className="size-4 animate-spin text-teal-600" />
                  <span className="font-semibold">{compilationStatus}</span>
                </div>
              )}

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
                        {receivedCount} / {totalChunks} parts
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">Parts received</div>
                      <div className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {chunks.size}
                      </div>
                    </div>
                  </div>

                  {totalChunks <= 200 ? (
                    <div className="pt-2">
                      <div className="mb-2 font-semibold text-slate-500">Received parts:</div>
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
                              title={`Part ${idx + 1}: ${isReceived ? 'Received' : 'Missing'}`}
                            >
                              {idx + 1}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl border border-teal-100 bg-teal-50/20 p-4 text-center dark:border-teal-900/50 dark:bg-teal-950/10" data-testid="fallback-progress-card">
                      <p className="mb-1 text-sm font-bold text-teal-800 dark:text-teal-400">High-Performance Progress Bar Active</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Detailed grid rendering is disabled to keep transfer smooth and avoid browser tab freeze.
                      </p>
                    </div>
                  )}
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
                <h2 className="font-semibold text-slate-700 dark:text-slate-200">
                  {receiverMode === 'camera' ? 'Camera Viewport' : 'Video Viewport'}
                </h2>
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

              {/* Video frame box with targeting guide or dropzone */}
              <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-slate-100 bg-slate-950 p-0 dark:border-slate-900">
                {isComplete ? (
                  <div className="flex size-full flex-col items-center justify-center gap-4 bg-slate-900 p-6 text-center text-slate-100 dark:bg-slate-950" data-testid="inline-complete-panel">
                    <div className="animate-pulse rounded-full bg-emerald-500/10 p-3 text-emerald-400">
                      <CheckCircle2 className="size-12" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-100">Transfer Complete</h3>
                      <p className="mt-1 text-xs text-slate-400">
                        All {totalChunks} parts were received. Your file is ready to download.
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
