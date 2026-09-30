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
import { useOpticalSender } from '@/packages/optical-transfer/client';
import { estimateTransferFrames, type TransferDensity } from '@/packages/optical-transfer';
import { paintTransferFrame } from './paintTransferFrame';
import { JsonLdScript } from '@/components/ui/JsonLdScript';
import { generateSchema } from '@/utils/schemaGenerator';
import { resolveDomainForPath } from '@/utils/metadataEngine';
import { usePageContext } from 'vike-react/usePageContext';
import { contentRegistry } from '@/data/contentRegistry';

const DENSITY_OPTIONS: ReadonlyArray<{ value: TransferDensity; label: string; hint: string }> = [
  { value: 'reliable', label: 'Reliable', hint: 'Small QR codes for older phones, dim rooms or a shaky hand.' },
  { value: 'balanced', label: 'Balanced', hint: 'Medium QR codes. Works for most phones held steady.' },
  { value: 'fast', label: 'Fast', hint: 'Large QR codes. Needs a sharp camera close to a bright screen.' },
];

/**
 * Formats a duration in seconds as a rough, human-readable estimate.
 * @param seconds Duration in seconds.
 * @returns For example "about 40 seconds" or "about 12 minutes".
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    const whole = Math.max(1, Math.round(seconds));
    return `about ${whole} second${whole === 1 ? '' : 's'}`;
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 90) return `about ${minutes} minute${minutes === 1 ? '' : 's'}`;
  return `about ${(seconds / 3600).toFixed(1)} hours`;
}

/**
 * High-Performance Animated QR File Transfer Tool - Sender only view
 * @returns The FileTransferToolInner component.
 */
function FileTransferToolInner() {
  const [isDraggingFile, setIsDraggingFile] = React.useState(false);
  const [showBetaAlert, setShowBetaAlert] = React.useState(true);
  const config = useQRStoreSelector(s => s.config);
  const scannabilityFallbackActive = useQRStoreSelector(s => s.isScannabilityFallbackActive);
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
    density,
    setDensity,
    fps,
    setFps,
    currentPass,
    fountainInfo,
    transferStats,
    canvasRef,
    startTransfer,
    stopTransfer,
    handleFileChange,
    simulate50MBFile,
  } = useOpticalSender({
    config,
    logoImg,
    borderLogoImg,
    renderFrame: paintTransferFrame,
    scannabilityFallbackActive,
  });

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Upper bound before compression: text-like files usually need far fewer frames.
  const estimate = React.useMemo(() => {
    if (!selectedFile) return null;
    try {
      return estimateTransferFrames(selectedFile.size, density);
    } catch {
      return null;
    }
  }, [selectedFile, density]);
  // Fountain streams never end: show frames against the typical number a receiver needs.
  const framesNeeded = fountainInfo ? Math.ceil(fountainInfo.k * 1.15) : totalFrames;
  const senderPercent = fountainInfo
    ? Math.min(100, Math.round((currentFrameIndex / Math.max(1, framesNeeded)) * 100))
    : progress;
  const activeDensityHint = DENSITY_OPTIONS.find(option => option.value === density)?.hint ?? '';

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
              <h2 className="flex items-center gap-2 text-xs font-bold tracking-wider text-fg-muted uppercase">
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
                      ? 'cursor-not-allowed border-line bg-slate-50/50 opacity-60 dark:bg-slate-950/20'
                      : isDraggingFile
                        ? 'cursor-copy border-teal-500 bg-teal-50 dark:bg-teal-950/30'
                        : 'cursor-pointer border-line bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950/20 dark:hover:bg-slate-950/40'
                  }`}
                >
                  <FileUp className="size-6 text-slate-400" aria-hidden="true" />
                  <span className="max-w-full truncate text-xs font-medium text-fg-muted">
                    {selectedFile ? selectedFile.name : 'Choose file or drag & drop'}
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    aria-label="Choose a file to send"
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
                <div className="space-y-2 rounded-xl border border-line-subtle bg-slate-50 p-4 text-xs dark:bg-slate-800/30">
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">Name:</span>
                    <span className="max-w-45 truncate font-semibold text-fg-soft">{selectedFile.name}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">Size:</span>
                    <span className="font-mono text-fg-soft">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                </div>
              )}
            </section>

            <div className="h-px bg-surface-hover" />

            {/* Live Streaming Speed / Pacing controls */}
            <section className="space-y-6">
              <h2 className="flex items-center gap-2 text-xs font-bold tracking-wider text-fg-muted uppercase">
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

              <div className="space-y-2">
                <span id="density-label" className="block text-sm font-medium text-fg-soft">
                  QR density
                </span>
                <div role="group" aria-labelledby="density-label" className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80">
                  {DENSITY_OPTIONS.map(option => (
                    <Button
                      key={option.value}
                      variant="outline"
                      size="sm"
                      pressed={density === option.value}
                      disabled={isTransferring}
                      onClick={() => setDensity(option.value)}
                      className="min-h-11 text-xs font-semibold"
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-fg-muted">{activeDensityHint}</p>
              </div>
              <p className="text-xs text-fg-muted" data-testid="fountain-symbol-info">
                {fountainInfo
                  ? `Each QR carries ${fountainInfo.symbolSize} bytes (${fountainInfo.compression === 'deflate-raw' ? 'compressed' : 'uncompressed'}). The receiver needs about ${Math.ceil(fountainInfo.k * 1.15)} frames, ${formatDuration((fountainInfo.k * 1.15) / fps)} at ${fps} frames/sec.`
                  : estimate
                    ? `Estimated transfer time: up to ${formatDuration(estimate.frames / fps)} at ${fps} frames/sec (${estimate.symbolSize} bytes per QR). Text and other compressible files go faster.`
                    : 'Choose a file to see how long the transfer will take.'}
              </p>
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
            <h2 className="text-xs font-bold tracking-wider text-fg-muted uppercase">
              3. QR Appearance
            </h2>
            <StyleControls config={config} onChange={store.updateConfig} />
          </section>
        }
        preview={
            <Card>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold text-fg-soft">
                  Transfer QR
                </h2>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-bold ${
                    isTransferring 
                      ? 'border border-success-line bg-success-soft text-emerald-700 dark:text-emerald-400' 
                      : 'border border-line bg-slate-100 text-fg-muted dark:bg-slate-900/30'
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
                    {isVerifyingHandshake ? 'Checking QR…' : 'Start Transfer'}
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
                <div className="mb-4 space-y-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-xs dark:border-slate-900 dark:bg-slate-900/40" data-testid="sender-progress">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 font-medium text-slate-500">
                      <Activity className="size-3.5 text-teal-600" aria-hidden="true" /> {fountainInfo ? 'First pass:' : 'Progress:'}
                    </span>
                    <span className="font-mono font-bold text-fg">{senderPercent}%</span>
                  </div>
                  
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div className="h-full bg-teal-600 motion-safe:transition-all motion-safe:duration-150" style={{ width: `${senderPercent}%` }} />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <div className="text-fg-muted">{fountainInfo ? 'Frames shown' : `Current QR (Pass ${currentPass})`}</div>
                      <div className="font-mono text-sm font-semibold text-fg-soft" data-testid="sender-frames">
                        {fountainInfo ? `${currentFrameIndex} of ~${framesNeeded}` : `${currentFrameIndex} / ${totalFrames}`}
                        {!fountainInfo && (
                          <span className="ml-1 text-xs text-accent">
                            {currentPass === 1 ? '(Seq)' : '(Shuffled)'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-fg-muted">
                        <Cpu className="size-3 text-teal-500" aria-hidden="true" /> Frame buffer
                      </div>
                      <div className="font-mono text-sm font-semibold text-fg-soft">{transferStats.frameBufferMemory}</div>
                    </div>
                  </div>
                  {fountainInfo && (
                    <p className="text-fg-muted">
                      The stream keeps going after the first pass so a receiver can join late or miss frames. Stop once the receiver shows Transfer Complete.
                    </p>
                  )}
                </div>
              )}

              {/* Recycled UI Canvas Container */}
              <div className="mb-4 flex items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:p-6 dark:border-slate-900 dark:bg-slate-950/50">
                <canvas
                  ref={canvasRef}
                  className="aspect-square max-h-[60vh] w-full rounded-lg bg-surface object-contain shadow-sm"
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
