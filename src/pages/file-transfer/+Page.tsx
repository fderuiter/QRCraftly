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
import { Play, Square, Upload, FileUp, Cpu, Sliders, Activity } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { RangeInput } from '@/components/ui/RangeInput';
import { Alert } from '@/components/ui/Alert';
import StyleControls from '@/components/StyleControls';
import { QRProvider, useQRStore, useQRStoreSelector } from '@/context/QRContext';
import { useImage } from '@/hooks/useImage';
import { ToolWorkspaceLayout, ToolWorkspaceHeader } from '@/components/ToolWorkspaceLayout';
import { useAnimatedQrSender } from '@/hooks/useAnimatedQrSender';
import { JsonLdScript } from '@/components/ui/JsonLdScript';
import { generateSchema } from '@/utils/schemaGenerator';
import { resolveDomainForPath } from '@/utils/metadataEngine';
import { usePageContext } from 'vike-react/usePageContext';
import { contentRegistry } from '@/data/contentRegistry';

/**
 * High-Performance Animated QR File Transfer Tool - Sender only view
 * @returns The FileTransferToolInner component.
 */
function FileTransferToolInner() {
  const [isDraggingFile, setIsDraggingFile] = React.useState(false);
  const [showBetaAlert, setShowBetaAlert] = React.useState(true);
  const config = useQRStoreSelector(s => s.config);
  const store = useQRStore();

  // Logo images
  const logoImg = useImage(config.logoUrl);
  const borderLogoImg = useImage(config.isBorderEnabled ? config.borderLogoUrl : null);

  // Hook into the unified animated QR sender
  const {
    selectedFile,
    setSelectedFile,
    isTransferring,
    isVerifyingHandshake,
    handshakeError,
    progress,
    currentFrameIndex,
    totalFrames,
    chunkSize,
    setChunkSize,
    fps,
    setFps,
    currentPass,
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

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    if (!isTransferring) {
      event.dataTransfer.dropEffect = 'copy';
      setIsDraggingFile(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent<HTMLLabelElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsDraggingFile(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDraggingFile(false);

    if (isTransferring) return;

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    const file = event.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      stopTransfer();
    }
  };

  return (
    <div className="w-full">
      <ToolWorkspaceLayout
        controlsLabel="Settings and Styling"
        previewLabel="Transfer QR"
        previewId="transfer-preview"
        header={
          <ToolWorkspaceHeader
            title="Send a File by QR Code"
            subtitle="Stream a file to another device as animated QR codes."
            badge="Beta"
            previewId="transfer-preview"
            previewJumpLabel="Jump to transfer QR"
          />
        }
        controls={
          <>
            {/* File Selection & Pacing Section */}
            <section className="space-y-4">
              <h2 className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-600 uppercase dark:text-slate-400">
                <Upload className="size-4 text-teal-600" aria-hidden="true" />
                1. Choose a File
              </h2>
              
              <div className="flex flex-col gap-3">
                <label
                  onDragEnter={handleDragOver}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`flex min-h-24 w-full min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed p-3 transition-colors ${
                    isTransferring
                      ? 'cursor-not-allowed border-slate-200 bg-slate-50/50 opacity-60 dark:border-slate-800 dark:bg-slate-950/20'
                      : isDraggingFile
                        ? 'cursor-copy border-teal-500 bg-teal-50 dark:bg-teal-950/30'
                        : 'cursor-pointer border-slate-200 bg-slate-50/50 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/20 dark:hover:bg-slate-950/40'
                  }`}
                >
                  <FileUp className="size-6 text-slate-400" aria-hidden="true" />
                  <span className="max-w-full truncate text-xs font-medium text-slate-600 dark:text-slate-400">
                    {selectedFile ? selectedFile.name : 'Choose file or drag & drop'}
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={isTransferring}
                  />
                </label>

                {import.meta.env.DEV && (
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
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">Name:</span>
                    <span className="max-w-45 truncate font-semibold text-slate-700 dark:text-slate-300">{selectedFile.name}</span>
                  </div>
                  <div className="flex justify-between gap-3">
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
                <Sliders className="size-4 text-teal-600" aria-hidden="true" />
                2. Transfer Settings
              </h2>

              <RangeInput
                id="fps-slider"
                label="Transfer speed"
                min={1}
                max={60}
                step={1}
                value={fps}
                onChange={setFps}
                formatValue={(v) => `${v} frames/sec`}
              />

              <RangeInput
                id="chunk-slider"
                label="Data per QR"
                min={64}
                max={240}
                step={16}
                value={chunkSize}
                onChange={(val) => {
                  setChunkSize(val);
                  stopTransfer();
                }}
                formatValue={(v) => `${v} bytes`}
              />
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
          /* Style Customization Section */
          <section className="space-y-4">
            <h2 className="text-xs font-bold tracking-wider text-slate-600 uppercase dark:text-slate-400">
              3. QR Appearance
            </h2>
            <StyleControls config={config} onChange={store.updateConfig} />
          </section>
        }
        preview={
            <Card>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold text-slate-700 dark:text-slate-200">
                  Transfer QR
                </h2>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-bold ${
                    isTransferring 
                      ? 'border border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' 
                      : 'border border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400'
                  }`}>
                    <span aria-hidden="true" className={`size-1.5 rounded-full ${isTransferring ? 'bg-emerald-500 motion-safe:animate-pulse' : 'bg-slate-400'}`} />
                    {isTransferring ? 'Transmitting' : 'Idle'}
                  </span>
                </div>
              </div>

              {/* Start / Stop comes before the stream so it follows the settings directly on mobile. */}
              <div className="mb-4 flex gap-3">
                {!isTransferring ? (
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={startTransfer}
                    disabled={!selectedFile || isVerifyingHandshake}
                    aria-label="Start file transfer"
                  >
                    <Play className="size-4" aria-hidden="true" />
                    {isVerifyingHandshake ? 'Verifying Handshake...' : 'Start Transfer'}
                  </Button>
                ) : (
                  <Button
                    variant="error"
                    fullWidth
                    onClick={stopTransfer}
                    aria-label="Stop file transfer"
                  >
                    <Square className="size-4" aria-hidden="true" />
                    Stop Transfer
                  </Button>
                )}
              </div>

              {/* Handshake scannability failure alert */}
              {handshakeError && (
                <div className="mb-4">
                  <Alert variant="error" title="Transfer Paused" role="alert">
                    {handshakeError}
                  </Alert>
                </div>
              )}

              {/* Active Transfer Stats */}
              {isTransferring && (
                <div className="mb-4 space-y-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-xs dark:border-slate-900 dark:bg-slate-900/40">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 font-medium text-slate-500">
                      <Activity className="size-3.5 text-teal-600" aria-hidden="true" /> Progress:
                    </span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{progress}%</span>
                  </div>
                  
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div className="h-full bg-teal-600 motion-safe:transition-all motion-safe:duration-150" style={{ width: `${progress}%` }} />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <div className="text-slate-500 dark:text-slate-400">Current QR (Pass {currentPass})</div>
                      <div className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {currentFrameIndex} / {totalFrames}
                        <span className="ml-1 text-xs text-teal-700 dark:text-teal-400">
                          {currentPass === 1 ? '(Seq)' : '(Shuffled)'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                        <Cpu className="size-3 text-teal-500" aria-hidden="true" /> Memory use
                      </div>
                      <div className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300">{transferStats.activeMemory}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Recycled UI Canvas Container */}
              <div className="mb-4 flex items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:p-6 dark:border-slate-900 dark:bg-slate-950/50">
                <canvas
                  ref={canvasRef}
                  className="aspect-square max-h-[60vh] w-full rounded-lg bg-white object-contain shadow-sm dark:bg-slate-900"
                  role="img"
                  aria-label="Transfer QR code"
                  width={512}
                  height={512}
                />
              </div>

              {/* Visual notice informing user about high-density stream style sanitization */}
              <Alert variant="info" role="note" title="Stream Style Preset Active">
                Styling options are automatically streamlined (center logos, borders, and complex module geometries are suppressed) on high-density data chunk frames to ensure maximum scannability.
              </Alert>
            </Card>
        }
      />
    </div>
  );
}

/**
 * High-Performance Animated QR File Transfer Page Component
 * @returns The rendered Page component wrapped in a QRProvider.
 */
export default function Page() {
  const pageContext = usePageContext();
  const urlPathname = pageContext?.urlPathname ?? '/file-transfer';
  const resolvedDomain = resolveDomainForPath(urlPathname);
  const schemaData = generateSchema(contentRegistry['file-transfer'], resolvedDomain, urlPathname);

  return (
    <QRProvider>
      <JsonLdScript data={schemaData} />
      <FileTransferToolInner />
    </QRProvider>
  );
}
