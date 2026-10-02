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

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Alert } from "./ui/Alert";
import { DEFAULT_CONFIG } from '@/constants';
import { QRConfig, SocialFormat } from '@/types';
import QRCanvas from '@/components/QRCanvas';
import { Download, Share2, ChevronDown, CircleHelp, Copy, Check, AlertTriangle } from 'lucide-react';
import { Modal } from './ui/Modal';
import { useDebounce } from '@/hooks/useDebounce';
import { useQRDownload, ExportStatus, ExportOptions } from '@/hooks/useQRDownload';
import { getExportRiskPolicy } from '@/utils/exportRiskPolicy';
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
import { contentRegistry } from '@/data/contentRegistry';
import { MiniPreview } from './MiniPreview';
import type { ExportRisk } from '@/packages/scannability';

/** One-line promise under every generator heading. */
const GENERATOR_SUBTITLE = 'No sign-up, no ads, never expires.';

/** Id of the generator preview region (target of the mobile jump link). */
const PREVIEW_ID = 'qr-preview';

/** Scan-safety dot shown in the mobile action bar, keyed by export risk. */
const STATUS_DOT_CLASSES: Record<ExportRisk, string> = {
  safe: 'bg-success',
  caution: 'bg-warning',
  unsafe: 'bg-danger',
};

const TEXT_ENTRY = 'input, textarea, select';

/**
 * From md up the preview is a sticky, viewport-height column, so the QR is sized by the
 * screen height: 18rem is left for the site header, the heading and status row, the export row and padding, which
 * keeps the QR and the Download control on screen without scrolling (#1050).
 */
const STAGE_SIZE_CLASSES: Record<SocialFormat, string> = {
  [SocialFormat.SQUARE_1_1]: 'md:max-w-[calc(100dvh_-_18rem)]',
  [SocialFormat.PORTRAIT_4_5]: 'md:max-w-[calc((100dvh_-_18rem)*0.8)]',
  [SocialFormat.STORY_9_16]: 'md:max-w-[calc((100dvh_-_18rem)*0.5625)]',
};
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
  const qrRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Focus preservation refs for originating buttons
  const downloadButtonRef = useRef<HTMLButtonElement>(null);
  const copyButtonRef = useRef<HTMLButtonElement>(null);
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const isEmpty = !config.value || !config.value.trim();
  const samplePayload = useMemo(() => getSamplePayload(config.type), [config.type]);
  const effectiveConfig = useMemo(() => (
    isEmpty ? { ...config, value: samplePayload } : config
  ), [config, isEmpty, samplePayload]);

  const { exportAsset } = useQRDownload(qrRef, effectiveConfig);
  const [copied, setCopied] = useState(false);
  // The mobile action bar steps aside while the on-screen keyboard is up.
  const [inputFocused, setInputFocused] = useState(false);
  useEffect(() => {
    const update = () => setInputFocused(document.activeElement instanceof Element && document.activeElement.matches(TEXT_ENTRY));
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    return () => {
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
    };
  }, []);
  const { canShare } = useCapabilities();

  // Scannability
  const { status: rawScannabilityStatus, checkScannability, health: rawHealth, workerRecoveryActive } = useScannability(canvasRef, effectiveConfig);

  // In sample fallback mode, report 'idle' status so stale/verified badges are suppressed
  const scannabilityStatus = isEmpty ? 'idle' : rawScannabilityStatus;
  const health = isEmpty ? undefined : rawHealth;

  const handleAutoFixContrast = useCallback(() => {
    store.updateConfig({
      fgColor: '#000000',
      bgColor: '#ffffff',
      eyeColor: '#000000',
    });
  }, [store]);

  const handleResetDefault = useCallback(() => {
    store.updateConfig({
      fgColor: DEFAULT_CONFIG.fgColor,
      bgColor: DEFAULT_CONFIG.bgColor,
      eyeColor: DEFAULT_CONFIG.eyeColor,
    });
  }, [store]);

  
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

  const onCopy = async () => {
    const action = async (options?: ExportOptions) => {
      const result = await exportAsset('clipboard', options);
      if (result.success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
      handleExportResult(result, copyButtonRef);
    };
    executeWithSafetyGate(action);
  };

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
    if (getExportRiskPolicy({ status: scannabilityStatus, health }) === 'unsafe') {
      setGateAction(() => () => action({ allowUnsafe: true }));
      setShowSafetyGate(true);
    } else {
      action();
    }
  };

  const handleSaveAsFlow = async (format: 'png' | 'jpeg' | 'webp', options?: ExportOptions) => {
    const result = await exportAsset(format, options);
    handleExportResult(result, downloadButtonRef);
  };

  const handleSaveSvgFlow = async (options?: ExportOptions) => {
    const result = await exportAsset('svg', options);
    handleExportResult(result, downloadButtonRef);
  };

  const onShare = async () => {
    const action = async (options?: ExportOptions) => {
      const result = await exportAsset('share', options);
      handleExportResult(result, shareButtonRef);
    };
    executeWithSafetyGate(action);
  };

  return (
    <div className="w-full" id="top">
      <Modal isOpen={showSafetyGate} onClose={() => setShowSafetyGate(false)} title="Scan Safety Warning">
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertTriangle className="size-12 text-amber-500" />
          <p className="text-fg-soft">
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
            previewId={PREVIEW_ID}
            previewJumpLabel="Preview & download"
            actions={
              <a
                href="#content-section"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-surface-hover"
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
             <Card padding="p-5">
                {/* Heading and status share one row; the heading never wraps and the status drops below it only when there is no room. */}
                <div className="mb-3 flex flex-wrap items-start justify-between gap-x-3" data-testid="preview-status">
                   <h2 className="py-1 font-semibold whitespace-nowrap text-fg-soft">Live Preview</h2>
                   <div className="flex items-start gap-2">
                   {isEmpty && (
                     <span
                       id={EMPTY_STATE_ID}
                       data-testid="sample-preview-badge"
                       className="mt-1 inline-flex items-center rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-semibold text-warning"
                     >
                       Sample Preview
                     </span>
                   )}
                   <ScannabilityIndicator
                     status={scannabilityStatus}
                     health={health}
                     onAutoFixContrast={handleAutoFixContrast}
                     onResetDefault={handleResetDefault}
                   />
                   </div>
                </div>

                {workerRecoveryActive && (
                   <div className="mb-4">
                      <Alert variant="warning" title="System Warning">
                         A temporary background system error occurred. The validator has recovered and subsequent retries are active.
                      </Alert>
                   </div>
                )}

                {/* Preview stage: the QR is the largest thing on the page. */}
                <div ref={qrRef} className="mb-4 flex justify-center rounded-xl bg-surface-sunken p-3 md:p-2" data-testid="qr-stage">
                   {/* Pass debounced config to QRCanvas to prevent heavy rendering on every keystroke */}
                   <QRCanvas ref={canvasRef} onRendered={handleRendered} config={debouncedConfig} className={`rounded-lg shadow-raised ${STAGE_SIZE_CLASSES[debouncedConfig.socialFormat] ?? STAGE_SIZE_CLASSES[SocialFormat.SQUARE_1_1]}`} />
                </div>

                {/* One export row. Below md it docks to the bottom of the screen as a sticky action bar. */}
                <div
                   className={`fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-line bg-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-overlay backdrop-blur md:static md:z-auto md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none ${inputFocused ? 'max-md:hidden' : ''}`}
                   data-testid="export-actions"
                >
                   <span
                     aria-hidden="true"
                     className={`size-2.5 shrink-0 rounded-full md:hidden ${STATUS_DOT_CLASSES[getExportRiskPolicy({ status: scannabilityStatus, health })]}`}
                     data-testid="export-status-dot"
                   />
                   {isEmpty ? (
                     <Button
                        ref={downloadButtonRef}
                        variant="primary"
                        fullWidth
                        className="flex-1 max-md:min-h-12"
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
                          className="max-md:min-h-12"
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
                      className="w-12 shrink-0 px-0 max-md:min-h-12"
                      title="Copy Image"
                      aria-label={copied ? "Copied to clipboard" : "Copy QR code to clipboard"}
                      aria-disabled={isEmpty ? 'true' : undefined}
                      aria-describedby={isEmpty ? EMPTY_STATE_ID : undefined}
                   >
                      {copied ? <Check className="size-5 text-success" aria-hidden="true" /> : <Copy className="size-5" aria-hidden="true" />}
                   </Button>

                   {canShare && (
                     <Button
                        ref={shareButtonRef}
                        variant="secondary"
                        onClick={onShare}
                        className="w-12 shrink-0 px-0 max-md:min-h-12"
                        title="Share"
                        aria-label="Share QR code"
                        aria-disabled={isEmpty ? 'true' : undefined}
                        aria-describedby={isEmpty ? EMPTY_STATE_ID : undefined}
                     >
                        <Share2 className="size-5" aria-hidden="true" />
                     </Button>
                   )}
                </div>

                {/* Tertiary: playful side feature, after the export row. */}
                {!isEmpty && <StressTestButton />}
             </Card>
        }
      />
      <MiniPreview sourceRef={canvasRef} targetId={PREVIEW_ID} renderKey={debouncedConfig} />
      {/* Keeps the last content clear of the mobile action bar. */}
      <div aria-hidden="true" className="h-20 md:hidden" />

      {/* Educational content: full width below the workspace, at article width. */}
      {belowControls.length > 0 && (
        <div className="border-t border-line bg-surface">
          <div className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
            {belowControls.map((Control) => (
              <Control.component key={Control.id} toolId={toolId} />
            ))}
          </div>
        </div>
      )}

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
