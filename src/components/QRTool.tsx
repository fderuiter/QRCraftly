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

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Alert } from "./ui/Alert";
import { QRConfig, TemplateStyle, SocialFormat } from '@/types';
import QRCanvas from '@/components/QRCanvas';
import { Download, Share2, ChevronDown, CircleHelp, Copy, Check, AlertTriangle } from 'lucide-react';
import { Modal } from './ui/Modal';
import { useDebounce } from '@/hooks/useDebounce';
import { useQRDownload, ExportStatus, ExportOptions } from '@/hooks/useQRDownload';
import { getExportRiskPolicy } from '@/utils/exportRiskPolicy';
import { isDangerousUrl } from '@/utils/security';
import { useToast } from './ui/Toast';
import { useScannability } from '@/hooks/useScannability';
import { ScannabilityIndicator } from '@/components/ScannabilityIndicator';
import { QRProvider, useQRStore, useQRStoreSelector } from '@/context/QRContext';
import { getSamplePayload } from '@/packages/qr-payload';
import { Menu } from './ui/Menu';
import { useCapabilities } from '@/hooks/useCapabilities';
import { sidebarControls } from '@/registry';
import { StressTestButton } from './arcade/StressTestButton';
import { ToolWorkspaceLayout, ToolWorkspaceHeader } from './ToolWorkspaceLayout';
import { PLEDGE_TAGLINE } from '@/data/pledge';
import { SOCIAL_DIMENSIONS } from '@/packages/qr-export';
import { RangeInput } from './ui/RangeInput';
import { contentRegistry } from '@/data/contentRegistry';

/** One-line promise under every generator heading. */
const GENERATOR_SUBTITLE = 'No sign-up, no ads, never expires.';

/** Id of the generator preview region (target of the mobile jump link). */
const PREVIEW_ID = 'qr-preview';
/** Id of the empty-preview explanation referenced by disabled export buttons. */
const EMPTY_STATE_ID = 'qr-empty-state';
/** Message shown when there is nothing to export yet. */
export const EMPTY_CONTENT_MESSAGE = 'Enter content to generate a QR code.';

/**
 * Renders the QR code generator interface with configuration controls, preview, and export actions.
 * @param title - Optional title used for the generator heading and branding.
 * @param toolId - Identifier passed to the sidebar controls.
 * @returns The QR code generator interface.
 */
const primaryControls = sidebarControls.filter((c) => c.placement === 'primary');
const secondaryControls = sidebarControls.filter((c) => c.placement === 'secondary');
const belowControls = sidebarControls.filter((c) => c.placement === 'below');

const GENERATOR_LINKS = [
  ['URL QR Code', '/'],
  ['Text QR Code', '/text-qr-code'],
  ['WiFi QR Code', '/wifi-qr-code'],
  ['vCard QR Code', '/vcard-qr-code'],
  ['Email QR Code', '/email-qr-code'],
  ['Phone QR Code', '/phone-qr-code'],
  ['SMS QR Code', '/sms-qr-code'],
  ['Payment QR Code', '/payment-qr-code'],
  ['Event QR Code', '/event-qr-code'],
  ['Location QR Code', '/location-qr-code'],
  ['Meeting QR Code', '/meeting-qr-code'],
  ['Social QR Code', '/social-qr-code'],
] as const;

function QRToolInner({ title, toolId = 'index' }: { title?: string, toolId?: string }) {
  // Keyword-led H1 from the content registry (e.g. "Free WiFi QR Code Generator"); the brand
  // stays in the header link and the <title>.
  const heading = contentRegistry[toolId]?.heading ?? title ?? 'QRCraftly';
  const config = useQRStoreSelector(s => s.config);
  const store = useQRStore();
  const setModuleCount = store.setModuleCount;
  const { addToast } = useToast();
  
  const [showSafetyGate, setShowSafetyGate] = useState(false);
  const [gateAction, setGateAction] = useState<(() => void | Promise<void>) | null>(null);
  const [exportResolution, setExportResolution] = useState<number>(1024);
  const qrRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Focus preservation refs for originating buttons
  const downloadButtonRef = useRef<HTMLButtonElement>(null);
  const copyButtonRef = useRef<HTMLButtonElement>(null);
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const photosButtonRef = useRef<HTMLButtonElement>(null);
  const isEmpty = !config.value || !config.value.trim();
  const samplePayload = useMemo(() => getSamplePayload(config.type), [config.type]);
  const effectiveConfig = useMemo(() => (
    isEmpty ? { ...config, value: samplePayload } : config
  ), [config, isEmpty, samplePayload]);

  const { exportAsset } = useQRDownload(qrRef, effectiveConfig);
  const [copied, setCopied] = useState(false);
  const { canShare } = useCapabilities();

  // Scannability
  const { status: rawScannabilityStatus, checkScannability, health: rawHealth, workerRecoveryActive } = useScannability(canvasRef, effectiveConfig);

  // In sample fallback mode, report 'idle' status so stale/verified badges are suppressed
  const scannabilityStatus = isEmpty ? 'idle' : rawScannabilityStatus;
  const health = isEmpty ? undefined : rawHealth;

  const getDensityLabel = (res: number) => {
    if (res < 800) return 'Standard (Screen)';
    if (res < 1600) return 'Medium (HD)';
    if (res < 3000) return 'High (Ultra HD)';
    return 'Maximum (Print Quality)';
  };

  const useTemplate = config.templateStyle !== TemplateStyle.NONE || config.socialFormat !== SocialFormat.SQUARE_1_1;
  let exportHeight = exportResolution;
  if (useTemplate) {
    const { width: fw, height: fh } = SOCIAL_DIMENSIONS[config.socialFormat] || { width: 1080, height: 1080 };
    exportHeight = Math.round((exportResolution * fh) / fw);
  }

  const handleRendered = useCallback((info: { moduleCount: number, virtualImageData?: ImageData, virtualImageBitmap?: ImageBitmap } = { moduleCount: 0 }) => {
    if (info.moduleCount) setModuleCount(info.moduleCount);
    if (info.virtualImageBitmap) {
      checkScannability(undefined, info.virtualImageBitmap, info.moduleCount);
    } else if (info.virtualImageData) {
      checkScannability(info.virtualImageData, undefined, info.moduleCount);
    }
  }, [setModuleCount, checkScannability]);

  // Debounce the effective config for QRCanvas to prevent lag during rapid typing or style changes.
  const debouncedConfig = useDebounce(effectiveConfig, 100);

  const handleExportResult = useCallback((result: ExportStatus, buttonRef?: React.RefObject<HTMLButtonElement | null>) => {
    // 1. Focus Recovery: return focus to the originating button control
    if (buttonRef && buttonRef.current) {
      buttonRef.current.focus();
    }

    // 2. Dispatch polite success/error toast notifications
    if (result.success) {
      if (result.format === 'clipboard') {
        addToast({
          type: 'success',
          message: 'QR code copied to clipboard!',
          duration: 5000,
        });
      } else if (result.format === 'share') {
        if (result.fallbackTriggered) {
          addToast({
            type: 'info',
            message: 'Sharing is not supported on this device/browser. The image will be downloaded instead.',
            duration: 5000,
          });
        } else {
          addToast({
            type: 'success',
            message: 'QR code shared successfully!',
            duration: 5000,
          });
        }
      } else if (result.format === 'svg') {
        if (result.logoOmitted) {
          addToast({
            type: 'warning',
            message: 'The remote logo was omitted from the SVG export due to connection or security limits. Try uploading a local image file instead.',
            duration: 7000,
          });
        } else {
          addToast({
            type: 'success',
            message: 'QR code exported successfully as SVG!',
            duration: 5000,
          });
        }
      } else {
        // png, jpeg, webp
        const upperFormat = result.format ? result.format.toUpperCase() : 'image';
        addToast({
          type: 'success',
          message: `QR code exported successfully as ${upperFormat}!`,
          duration: 5000,
        });
      }
    } else {
      // Failed or aborted
      // Check if it's user abort
      if (result.error && result.error.name === 'AbortError') {
        // User cancelled, usually no toast needed or just a gentle warning
        return;
      }
      addToast({
        type: 'error',
        message: result.error?.message || `Failed to export QR code as ${result.format || 'image'}.`,
        duration: 5000,
      });
    }
  }, [addToast]);

  const notifyEmpty = () => {
    addToast({
      type: 'info',
      message: `${EMPTY_CONTENT_MESSAGE} Exports are available once there is something to encode.`,
      duration: 5000,
    });
  };

  const executeWithSafetyGate = (action: (options?: ExportOptions) => void | Promise<void>) => {
    if (isEmpty) {
      notifyEmpty();
      return;
    }
    const mergedOpts: ExportOptions = { exportSize: exportResolution };
    if (getExportRiskPolicy({ status: scannabilityStatus, health }) === 'unsafe') {
      setGateAction(() => () => action({ ...mergedOpts, allowUnsafe: true }));
      setShowSafetyGate(true);
    } else {
      action(mergedOpts);
    }
  };

  const onCopy = async () => {
    const action = async (options?: ExportOptions) => {
      const opts = { exportSize: exportResolution, ...options };
      const result = await exportAsset('clipboard', opts);
      if (result.success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
      handleExportResult(result, copyButtonRef);
    };
    executeWithSafetyGate(action);
  };

  const handleSaveAsFlow = async (format: 'png' | 'jpeg' | 'webp', options?: ExportOptions) => {
    const opts = { exportSize: exportResolution, ...options };
    const result = await exportAsset(format, opts);
    handleExportResult(result, downloadButtonRef);
  };

  const handleSaveSvgFlow = async (options?: ExportOptions) => {
    const opts = { exportSize: exportResolution, ...options };
    const result = await exportAsset('svg', opts);
    handleExportResult(result, downloadButtonRef);
  };

  const downloadToDeviceFlow = async (format: 'png' | 'jpeg' | 'webp', buttonRef: React.RefObject<HTMLButtonElement | null>, options?: ExportOptions) => {
    const opts = { exportSize: exportResolution, ...options };
    const result = await exportAsset(format, { ...opts, directDownload: true });
    handleExportResult(result, buttonRef);
  };

  const onShare = async () => {
    const action = async (options?: ExportOptions) => {
      const opts = { exportSize: exportResolution, ...options };
      const result = await exportAsset('share', opts);
      handleExportResult(result, shareButtonRef);
    };
    executeWithSafetyGate(action);
  };

  return (
    <div className="w-full" id="top">
      <Modal isOpen={showSafetyGate} onClose={() => setShowSafetyGate(false)} title="Scan Safety Warning">
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertTriangle className="size-12 text-amber-500" />
          <p className="text-slate-700 dark:text-slate-300">
            This QR code might fail to scan in real-world conditions. We recommend adjusting colors, pattern, or margin for better contrast.
          </p>
          <div className="mt-4 flex w-full gap-3">
             <Button variant="outline" fullWidth onClick={() => setShowSafetyGate(false)}>Go Back</Button>
             <Button variant="primary" fullWidth onClick={() => {
               setShowSafetyGate(false);
               if (gateAction) gateAction();
             }}>Export Anyway</Button>
          </div>
        </div>
      </Modal>
      <ToolWorkspaceLayout
        controlsLabel="QR Code Settings"
        previewLabel="QR Code Preview"
        previewId={PREVIEW_ID}
        header={
          <ToolWorkspaceHeader
            title={heading}
            subtitle={GENERATOR_SUBTITLE}
            brandIsHeading={heading === 'QRCraftly'}
            previewId={PREVIEW_ID}
            previewJumpLabel="Preview & download"
            actions={
              <a
                href="#content-section"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                title="How to use"
                aria-label="How to use"
              >
                <CircleHelp className="size-5" aria-hidden="true" />
              </a>
            }
          />
        }
        controls={primaryControls.map((Control) => (
          <Control.component key={Control.id} toolId={toolId} />
        ))}
        secondary={secondaryControls.map((Control) => (
          <Control.component key={Control.id} toolId={toolId} />
        ))}
        preview={
             <Card>
                <div className="mb-6 flex items-center justify-between gap-2">
                    <h2 className="font-semibold text-slate-700 dark:text-slate-200">Live Preview</h2>
                    <div className="flex items-center gap-2">
                      {isEmpty && (
                        <span
                          id={EMPTY_STATE_ID}
                          data-testid="sample-preview-badge"
                          className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"
                        >
                          Sample Preview
                        </span>
                      )}
                      <ScannabilityIndicator status={scannabilityStatus} health={health} />
                    </div>
                </div>
                {!isEmpty && <StressTestButton />}
                
                {workerRecoveryActive && (
                   <div className="mb-4">
                      <Alert variant="warning" title="System Warning">
                         A temporary background system error occurred. The validator has recovered and subsequent retries are active.
                      </Alert>
                   </div>
                )}

                <div ref={qrRef} className="mb-8 flex justify-center">
                   {/* Pass debounced config to QRCanvas to prevent heavy rendering on every keystroke */}
                   <QRCanvas ref={canvasRef} onRendered={handleRendered} config={debouncedConfig} className="max-h-[60vh] w-full rounded-lg object-contain shadow-sm" />
                </div>

                {!isEmpty && (
                  <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50" data-testid="resolution-controls">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Export Resolution</span>
                        <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-semibold text-teal-800 dark:bg-teal-900/60 dark:text-teal-300">
                          {getDensityLabel(exportResolution)}
                        </span>
                      </div>
                      <span className="font-mono text-xs font-medium text-slate-600 dark:text-slate-400" data-testid="resolution-display">
                        {exportResolution} × {exportHeight} px
                      </span>
                    </div>

                    <RangeInput
                      id="export-resolution-slider"
                      label="Dimension Control"
                      value={exportResolution}
                      onChange={(val) => setExportResolution(val)}
                      min={200}
                      max={4000}
                      step={50}
                      formatValue={(val) => `${val}px`}
                    />

                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Presets:</span>
                      {[512, 1024, 2000, 4000].map((preset) => (
                        <Button
                          key={preset}
                          variant="outline"
                          size="sm"
                          pressed={exportResolution === preset}
                          onClick={() => setExportResolution(preset)}
                          className="px-2 py-1 text-xs"
                          aria-label={`Set resolution to ${preset}px`}
                        >
                          {preset}px
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid w-full grid-cols-1 gap-3">
                   {/* Row 1: Download & Share */}
                   <div className="flex gap-2">
                       {isEmpty ? (
                         <Button
                            ref={downloadButtonRef}
                            variant="primary"
                            fullWidth
                            className="flex-1"
                            aria-disabled="true"
                            aria-describedby={EMPTY_STATE_ID}
                            onClick={notifyEmpty}
                         >
                            <Download className="size-4" aria-hidden="true" />
                            Download
                            <ChevronDown className="ml-auto size-4 opacity-80" aria-hidden="true" />
                         </Button>
                       ) : (
                       <Menu
                          id="download-format"
                          className="flex-1"
                          triggerRef={downloadButtonRef}
                          items={[
                            { id: 'png', label: <><span aria-hidden="true" className="size-1.5 rounded-full bg-teal-500"></span> PNG (High Quality)</>, onSelect: () => executeWithSafetyGate((opts) => handleSaveAsFlow('png', opts)) },
                            { id: 'jpeg', label: <><span aria-hidden="true" className="size-1.5 rounded-full bg-blue-500"></span> JPEG (Compact)</>, onSelect: () => executeWithSafetyGate((opts) => handleSaveAsFlow('jpeg', opts)) },
                            { id: 'webp', label: <><span aria-hidden="true" className="size-1.5 rounded-full bg-purple-500"></span> WebP (Modern)</>, onSelect: () => executeWithSafetyGate((opts) => handleSaveAsFlow('webp', opts)) },
                            { id: 'svg', separatorBefore: true, label: <><span aria-hidden="true" className="size-1.5 rounded-full bg-orange-500"></span> SVG (Vector)</>, onSelect: () => executeWithSafetyGate((opts) => handleSaveSvgFlow(opts)) },
                          ]}
                          renderTrigger={(triggerProps) => (
                            <Button
                              {...triggerProps}
                              variant={getExportRiskPolicy({ status: scannabilityStatus, health }) === 'unsafe' ? 'error' : 'primary'}
                              fullWidth
                            >
                              <Download className="size-4" aria-hidden="true" />
                              Download
                              <ChevronDown className="ml-auto size-4 opacity-80" aria-hidden="true" />
                            </Button>
                          )}
                       />
                       )}
                       
                       <Button
                          ref={copyButtonRef}
                          variant="secondary"
                          onClick={onCopy}
                          className="w-12 px-0"
                          title="Copy Image"
                          aria-label={copied ? "Copied to clipboard" : "Copy QR code to clipboard"}
                          aria-disabled={isEmpty ? 'true' : undefined}
                          aria-describedby={isEmpty ? EMPTY_STATE_ID : undefined}
                       >
                          {copied ? <Check className="size-5 text-emerald-500" aria-hidden="true" /> : <Copy className="size-5" aria-hidden="true" />}
                       </Button>

                       {canShare && (
                         <Button 
                            ref={shareButtonRef}
                            variant="secondary"
                            onClick={onShare}
                            className="w-12 px-0"
                            title="Share"
                            aria-label="Share QR code"
                            aria-disabled={isEmpty ? 'true' : undefined}
                            aria-describedby={isEmpty ? EMPTY_STATE_ID : undefined}
                         >
                            <Share2 className="size-5" aria-hidden="true" />
                         </Button>
                       )}
                   </div>

                   {/* Row 2: Quick PNG download */}
                   <Button 
                      ref={photosButtonRef}
                      variant="outline"
                      fullWidth
                      onClick={() => executeWithSafetyGate((opts) => downloadToDeviceFlow('png', photosButtonRef, opts))}
                      aria-label="Download QR code as PNG"
                      aria-disabled={isEmpty ? 'true' : undefined}
                      aria-describedby={isEmpty ? EMPTY_STATE_ID : undefined}
                   >
                      <Download className="size-4" aria-hidden="true" />
                      Download PNG
                   </Button>

                </div>
             </Card>
        }
      />

      {/* Educational content: full width below the workspace, at article width. */}
      {belowControls.length > 0 && (
        <div className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
            {belowControls.map((Control) => (
              <Control.component key={Control.id} toolId={toolId} />
            ))}
          </div>
        </div>
      )}

      <footer className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <nav aria-label="Site Map">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h2 className="mb-3 text-xs font-semibold tracking-wider text-slate-900 uppercase dark:text-slate-200">Generators</h2>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  {GENERATOR_LINKS.map(([label, href]) => {
                    if (!isDangerousUrl(href)) {
                      return <li key={href}><a href={href} className="transition-colors hover:text-teal-700 dark:hover:text-teal-400">{label}</a></li>;
                    }
                    return null;
                  })}
                  <li>
                    <a href="/file-transfer" className="inline-flex items-center gap-1.5 font-semibold text-teal-700 transition-colors hover:text-teal-800 dark:text-teal-300 dark:hover:text-teal-200">
                      <span>File Share (Send)</span>
                      <span className="rounded-full bg-teal-100 px-1.5 py-0.5 text-xs font-semibold text-teal-800 dark:bg-teal-900/60 dark:text-teal-300">Beta</span>
                    </a>
                  </li>
                  <li>
                    <a href="/file-transfer/receive" className="inline-flex items-center gap-1.5 font-semibold text-teal-700 transition-colors hover:text-teal-800 dark:text-teal-300 dark:hover:text-teal-200">
                      <span>File Share (Receive)</span>
                      <span className="rounded-full bg-teal-100 px-1.5 py-0.5 text-xs font-semibold text-teal-800 dark:bg-teal-900/60 dark:text-teal-300">Beta</span>
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h2 className="mb-3 text-xs font-semibold tracking-wider text-slate-900 uppercase dark:text-slate-200">Company</h2>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li><a href="/about" className="transition-colors hover:text-teal-700 dark:hover:text-teal-400">About</a></li>
                  <li><a href="/free-forever" className="transition-colors hover:text-teal-700 dark:hover:text-teal-400">No-Ads Pledge</a></li>
                  <li><a href="/security#security" className="transition-colors hover:text-teal-700 dark:hover:text-teal-400">Security Policy</a></li>
                  <li><a href="/security#compliance" className="transition-colors hover:text-teal-700 dark:hover:text-teal-400">Privacy Architecture</a></li>
                  <li><a href="https://github.com/fderuiter/QRCraftly" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-teal-700 dark:hover:text-teal-400">GitHub</a></li>
                </ul>
              </div>
            </div>
          </nav>
        </div>
        <p className="mx-auto max-w-7xl border-t border-slate-200 px-4 py-5 text-xs text-slate-500 sm:px-6 dark:border-slate-800 dark:text-slate-400">
          <a href="/free-forever" className="font-medium text-slate-600 hover:text-teal-700 dark:text-slate-300 dark:hover:text-teal-400">{PLEDGE_TAGLINE}</a>{' '}
          &copy; {new Date().getFullYear()} QRCraftly. Open Source.
        </p>
      </footer>
    </div>
  );
}

export default function QRTool({ initialConfig, title, toolId = 'index' }: { initialConfig?: Partial<QRConfig>, title?: string, toolId?: string }) {
  return (
    <QRProvider initialConfig={initialConfig} retainAppearance>
      <QRToolInner title={title} toolId={toolId} />
    </QRProvider>
  );
}
