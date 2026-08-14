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

import React from 'react';
import { Play, Square, Upload, FileUp, Cpu, Sliders, Sun, Moon, QrCode, Activity } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { RangeInput } from '@/components/ui/RangeInput';
import StyleControls from '@/components/StyleControls';
import { QRProvider, useQRStore, useQRStoreSelector } from '@/context/QRContext';
import { useImage } from '@/hooks/useImage';
import { useTheme } from '@/hooks/useTheme';
import { useAnimatedQrSender } from '@/hooks/useAnimatedQrSender';

/**
 * High-Performance Animated QR File Transfer Tool - Sender only view
 * @returns The FileTransferToolInner component.
 */
function FileTransferToolInner() {
  const config = useQRStoreSelector(s => s.config);
  const store = useQRStore();
  const { isDarkMode, toggleDarkMode } = useTheme();

  // Logo images
  const logoImg = useImage(config.logoUrl);
  const borderLogoImg = useImage(config.isBorderEnabled ? config.borderLogoUrl : null);

  // Hook into the unified animated QR sender
  const {
    selectedFile,
    isTransferring,
    progress,
    currentFrameIndex,
    totalFrames,
    chunkSize,
    setChunkSize,
    fps,
    setFps,
    transferStats,
    canvasRef,
    startTransfer,
    stopTransfer,
    handleFileChange,
    simulate50MBFile,
  } = useAnimatedQrSender({
    config,
    logoImg,
    borderLogoImg,
  });

  return (
    <div className={`${isDarkMode ? 'dark' : ''} w-full`}>
      <div className="relative flex h-screen min-h-screen flex-col-reverse overflow-hidden bg-slate-50 transition-colors duration-300 md:h-auto md:min-h-0 md:flex-row md:overflow-visible dark:bg-slate-950">
        
        {/* Left Control Sidebar */}
        <aside aria-label="Settings and Styling" className="relative z-10 flex max-h-[50vh] w-full flex-col overflow-y-auto border-r border-slate-200 bg-white shadow-xl transition-colors duration-300 md:max-h-none md:w-120 dark:border-slate-800 dark:bg-slate-900">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-100 bg-white p-6 transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900">
            <div>
              <a href="/" aria-label="Home" className="mb-1 flex items-center gap-2 text-teal-700 transition-opacity hover:opacity-80 dark:text-teal-400">
                <QrCode className="size-6" />
                <h1 className="text-xl font-bold tracking-tight text-slate-700 dark:text-slate-100">QRCraftly</h1>
              </a>
              <p className="text-sm text-slate-600 dark:text-slate-400">High-Performance File Streaming</p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/file-transfer/receive"
                className="hidden items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-teal-600 transition-colors hover:bg-slate-100 sm:flex dark:text-teal-400 dark:hover:bg-slate-800"
                title="Receive File"
                aria-label="Receive Offline File"
              >
                Receive File
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
            {/* File Selection & Pacing Section */}
            <section className="space-y-4">
              <h2 className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-600 uppercase dark:text-slate-400">
                <Upload className="size-4 text-teal-600" />
                1. File Stream Source
              </h2>
              
              <div className="flex flex-col gap-3">
                <label className="flex h-24 w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/20 dark:hover:bg-slate-950/40">
                  <FileUp className="size-6 text-slate-400" />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    {selectedFile ? selectedFile.name : 'Choose file or drag & drop'}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={isTransferring}
                  />
                </label>

                {!import.meta.env.PROD && (
                  <Button
                    variant="outline"
                    onClick={simulate50MBFile}
                    disabled={isTransferring}
                    className="w-full text-xs"
                  >
                    <Cpu className="size-4" />
                    Simulate 50MB High-Load File
                  </Button>
                )}
              </div>

              {selectedFile && (
                <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs dark:border-slate-800 dark:bg-slate-800/30">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Name:</span>
                    <span className="max-w-45 truncate font-semibold text-slate-700 dark:text-slate-300">{selectedFile.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Size:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                </div>
              )}
            </section>

            <div className="h-px bg-slate-100 dark:bg-slate-800" />

            {/* Live Streaming Speed / Pacing controls */}
            <section className="space-y-6">
              <h2 className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-600 uppercase dark:text-slate-400">
                <Sliders className="size-4 text-teal-600" />
                2. Playback Speed & Chunking
              </h2>

              <RangeInput
                id="fps-slider"
                label="Stream Swap Rate (FPS)"
                min={1}
                max={60}
                step={1}
                value={fps}
                onChange={setFps}
                formatValue={(v) => `${v} frames/sec`}
              />

              <RangeInput
                id="chunk-slider"
                label="Slice Block Size"
                min={64}
                max={512}
                step={32}
                value={chunkSize}
                onChange={(val) => {
                  setChunkSize(val);
                  stopTransfer();
                }}
                formatValue={(v) => `${v} bytes`}
              />
            </section>

            <div className="h-px bg-slate-100 dark:bg-slate-800" />

            {/* Style Customization Section */}
            <section className="space-y-4">
              <h2 className="text-xs font-bold tracking-wider text-slate-600 uppercase dark:text-slate-400">
                3. QR Frame Customizer
              </h2>
              <StyleControls config={config} onChange={store.updateConfig} />
            </section>
          </div>
        </aside>

        {/* Right Preview Recycled Canvas / Camera Area */}
        <section aria-label="Animated Stream Output" className="relative flex max-h-[50vh] flex-1 flex-col items-center justify-center overflow-x-hidden overflow-y-auto bg-slate-50 p-4 transition-colors duration-300 md:sticky md:top-0 md:h-[100dvh] md:max-h-none md:p-8 dark:bg-slate-950">
          
          {/* Background Decorative glow */}
          <div className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-20">
            <div className="absolute top-0 left-0 size-96 -translate-1/2 rounded-full bg-teal-200 blur-3xl transition-colors duration-300 dark:bg-teal-900"></div>
            <div className="absolute right-0 bottom-0 size-96 translate-1/2 rounded-full bg-slate-300 blur-3xl transition-colors duration-300 dark:bg-slate-800"></div>
          </div>

          <div className="relative z-10 w-full max-w-md">
            <Card className="hover:scale-1.01 transform transition-all duration-300">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="font-semibold text-slate-700 dark:text-slate-200">
                  Recycled UI Stream Canvas
                </h2>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-bold ${
                    isTransferring 
                      ? 'border border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' 
                      : 'border border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400'
                  }`}>
                    <span className={`size-1.5 rounded-full ${isTransferring ? 'animate-pulse bg-emerald-500' : 'bg-slate-400'}`} />
                    {isTransferring ? 'Transmitting' : 'Idle'}
                  </span>
                </div>
              </div>

              <>
                {/* Recycled UI Canvas Container */}
                <div className="mb-8 flex min-h-75 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 p-6 dark:border-slate-900 dark:bg-slate-950/50">
                  <canvas
                    ref={canvasRef}
                    className="max-h-[60vh] w-full rounded-lg bg-white object-contain shadow-sm dark:bg-slate-900"
                    role="img"
                    aria-label="High-performance animation transfer stream canvas"
                    width={512}
                    height={512}
                  />
                </div>

                {/* Active Transfer Stats & Controls */}
                <div className="grid w-full grid-cols-1 gap-4">
                  
                  {isTransferring && (
                    <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-xs dark:border-slate-900 dark:bg-slate-900/40">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 font-medium text-slate-500">
                          <Activity className="size-3.5 text-teal-600" /> Progress:
                        </span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{progress}%</span>
                      </div>
                      
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                        <div className="h-full bg-teal-600 transition-all duration-150" style={{ width: `${progress}%` }} />
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div>
                          <div className="text-slate-400">Current Frame</div>
                          <div className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300">{currentFrameIndex} / {totalFrames}</div>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 text-slate-400">
                            <Cpu className="size-3 text-teal-500" /> Active Heap
                          </div>
                          <div className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300">{transferStats.activeMemory}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    {!isTransferring ? (
                      <Button
                        variant="primary"
                        fullWidth
                        onClick={startTransfer}
                        disabled={!selectedFile}
                        aria-label="Start streaming file"
                      >
                        <Play className="size-4" />
                        Start Transfer Stream
                      </Button>
                    ) : (
                      <Button
                        variant="error"
                        fullWidth
                        onClick={stopTransfer}
                        aria-label="Stop streaming file"
                      >
                        <Square className="size-4" />
                        Stop Transfer Stream
                      </Button>
                    )}
                  </div>
                </div>
              </>
            </Card>
          </div>
        </section>

      </div>
    </div>
  );
}

/**
 * High-Performance Animated QR File Transfer Page Component
 * @returns The rendered Page component wrapped in a QRProvider.
 */
export default function Page() {
  return (
    <QRProvider>
      <FileTransferToolInner />
    </QRProvider>
  );
}
