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

import React, { useState, useRef, useCallback } from 'react';
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Alert } from "./ui/Alert";
import { QRConfig } from '@/types';
import QRCanvas from '@/components/QRCanvas';
import { Download, Share2, QrCode, ChevronDown, Moon, Sun, Info, Copy, Check, AlertTriangle, Menu } from 'lucide-react';
import { Modal } from './ui/Modal';
import { useDebounce } from '@/hooks/useDebounce';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';
import { useQRDownload, ExportStatus } from '@/hooks/useQRDownload';
import { getExportRiskPolicy } from '@/utils/exportRiskPolicy';
import { useToast } from './ui/Toast';
import { useScannability } from '@/hooks/useScannability';
import { ScannabilityIndicator } from '@/components/ScannabilityIndicator';
import { QRProvider, useQRStore, useQRStoreSelector } from '@/context/QRContext';
import { useTheme } from '@/hooks/useTheme';
import { useTelemetry } from '@/hooks/useTelemetry';
import { useCapabilities } from '@/hooks/useCapabilities';
import { sidebarControls } from '@/registry';

/**
 * Renders the QR code generator interface with configuration controls, preview, and export actions.
 * @param title - Optional title used for the generator heading and branding.
 * @param title.title
 * @param toolId - Identifier passed to the sidebar controls.
 * @param title.toolId
 * @returns The QR code generator interface.
 */
function QRToolInner({ title, toolId = 'index' }: { title?: string, toolId?: string }) {
  const config = useQRStoreSelector(s => s.config);
  const store = useQRStore();
  const emitSignal = store.emitSignal;
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { addToast } = useToast();
  
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [showSafetyGate, setShowSafetyGate] = useState(false);
  const [gateAction, setGateAction] = useState<(() => void | Promise<void>) | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const downloadMenuRef = useRef<HTMLDivElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);

  // Focus preservation refs for originating buttons
  const downloadButtonRef = useRef<HTMLButtonElement>(null);
  const copyButtonRef = useRef<HTMLButtonElement>(null);
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const photosButtonRef = useRef<HTMLButtonElement>(null);

  const { downloadToDevice: hookDownload, handleSaveAs: hookSaveAs, handleSaveSvg: hookSaveSvg, handleShare, handleCopy } = useQRDownload(qrRef, config);
  const [copied, setCopied] = useState(false);
  const { canShare } = useCapabilities();

  // Scannability & Telemetry
  const { status: scannabilityStatus, checkScannability, health, workerRecoveryActive } = useScannability(canvasRef, config);

  
  const handleRendered = useCallback((info: { moduleCount: number, virtualImageData?: ImageData, virtualImageBitmap?: ImageBitmap } = { moduleCount: 0 }) => {
    if (info.moduleCount && !info.virtualImageData && !info.virtualImageBitmap) emitSignal('render-complete', info);
    if (info.virtualImageBitmap) {
      checkScannability(undefined, info.virtualImageBitmap, info.moduleCount);
    } else if (info.virtualImageData) {
      checkScannability(info.virtualImageData, undefined, info.moduleCount);
    }
  }, [emitSignal, checkScannability]);
  const { showTelemetryPrompt, handleOptIn } = useTelemetry(scannabilityStatus);

  // Close download menu when clicking outside
  const closeDownloadMenu = useCallback(() => setShowDownloadMenu(false), []);
  useOnClickOutside(downloadMenuRef, closeDownloadMenu, showDownloadMenu);
  const closeMobileNav = useCallback(() => setShowMobileNav(false), []);
  useOnClickOutside(mobileNavRef, closeMobileNav, showMobileNav);

  // Debounce the config for QRCanvas to prevent lag during rapid typing or style changes.
  const debouncedConfig = useDebounce(config, 100);

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
    const action = async () => {
      const result = await handleCopy();
      if (result.success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
      handleExportResult(result, copyButtonRef);
    };
    executeWithSafetyGate(action);
  };

  const executeWithSafetyGate = (action: () => void | Promise<void>) => {
    if (getExportRiskPolicy({ status: scannabilityStatus, health }) === 'unsafe') {
      setGateAction(() => action);
      setShowSafetyGate(true);
    } else {
      action();
    }
  };

  const handleSaveAsFlow = async (format: 'png' | 'jpeg' | 'webp') => {
    setShowDownloadMenu(false);
    const result = await hookSaveAs(format);
    handleExportResult(result, downloadButtonRef);
  };

  const handleSaveSvgFlow = async () => {
    setShowDownloadMenu(false);
    const result = await hookSaveSvg();
    handleExportResult(result, downloadButtonRef);
  };

  const downloadToDeviceFlow = async (format: 'png' | 'jpeg' | 'webp', buttonRef: React.RefObject<HTMLButtonElement | null>) => {
    setShowDownloadMenu(false);
    const result = await hookDownload(format);
    handleExportResult(result, buttonRef);
  };

  const onShare = async () => {
    const action = async () => {
      const result = await handleShare();
      handleExportResult(result, shareButtonRef);
    };
    executeWithSafetyGate(action);
  };

  return (
    <div className={`${isDarkMode ? 'dark' : ''} w-full`} id="top">
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
      <div className="relative flex min-h-screen flex-col-reverse bg-slate-50 transition-colors duration-300 md:min-h-0 md:flex-row dark:bg-slate-950">
        {/* Sidebar Controls */}
        <aside aria-label="QR Code Settings" className="relative z-10 flex w-full flex-col border-r border-slate-200 bg-white shadow-xl transition-colors duration-300 md:w-120 dark:border-slate-800 dark:bg-slate-900">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-100 bg-white p-6 transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900">
            <div>
              <a href="/" aria-label="QRCraftly Home" className="mb-1 flex items-center gap-2 text-teal-700 transition-opacity hover:opacity-80 dark:text-teal-400">
                <QrCode className="size-6" />
                <h1 className="text-xl font-bold tracking-tight text-slate-700 dark:text-slate-100">{title || "QRCraftly"}</h1>
              </a>
              <p className="text-sm text-slate-600 dark:text-slate-400">Design beautiful QR codes in seconds.</p>
            </div>
            
            <div className="flex items-center gap-2">
              <div ref={mobileNavRef} className="relative sm:hidden">
                <Button
                  variant="icon"
                  size="icon"
                  onClick={() => setShowMobileNav((isOpen) => !isOpen)}
                  className="rounded-full"
                  title="File transfer menu"
                  aria-label="File transfer menu"
                  aria-expanded={showMobileNav}
                  aria-controls="mobile-file-transfer-menu"
                >
                  <Menu className="size-5" />
                </Button>
                {showMobileNav && (
                  <nav
                    id="mobile-file-transfer-menu"
                    aria-label="File transfer"
                    className="absolute top-full right-0 z-30 mt-2 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
                  >
                    <a
                      href="/file-transfer"
                      aria-label="Send File"
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-teal-700 transition-colors hover:bg-slate-100 dark:text-teal-400 dark:hover:bg-slate-800"
                    >
                      <span>Send File</span>
                      <span aria-hidden="true" className="rounded-full bg-teal-100 px-1.5 py-0.5 text-[10px] font-semibold text-teal-800 dark:bg-teal-900/60 dark:text-teal-300">Beta</span>
                    </a>
                    <a
                      href="/file-transfer/receive"
                      aria-label="Receive File"
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-teal-700 transition-colors hover:bg-slate-100 dark:text-teal-400 dark:hover:bg-slate-800"
                    >
                      <span>Receive File</span>
                      <span aria-hidden="true" className="rounded-full bg-teal-100 px-1.5 py-0.5 text-[10px] font-semibold text-teal-800 dark:bg-teal-900/60 dark:text-teal-300">Beta</span>
                    </a>
                  </nav>
                )}
              </div>
              <a
                href="/file-transfer"
                className="hidden items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold text-teal-700 transition-colors hover:bg-slate-100 sm:flex dark:text-teal-400 dark:hover:bg-slate-800"
                title="Send File"
                aria-label="Send Offline File"
              >
                <span>Send File</span>
                <span className="rounded-full bg-teal-100 px-1.5 py-0.5 text-[10px] font-semibold text-teal-800 dark:bg-teal-900/60 dark:text-teal-300">Beta</span>
              </a>
              <a
                href="/file-transfer/receive"
                className="hidden items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold text-teal-700 transition-colors hover:bg-slate-100 sm:flex dark:text-teal-400 dark:hover:bg-slate-800"
                title="Receive File"
                aria-label="Receive Offline File"
              >
                <span>Receive File</span>
                <span className="rounded-full bg-teal-100 px-1.5 py-0.5 text-[10px] font-semibold text-teal-800 dark:bg-teal-900/60 dark:text-teal-300">Beta</span>
              </a>
              <a
                href="#content-section"
                className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                title="About Us"
                aria-label="About QRCraftly"
              >
                <Info className="size-5" />
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
            {sidebarControls.map((Control, index) => (
              <React.Fragment key={Control.id}>
                <Control.component toolId={toolId} />
                {index < sidebarControls.length - 1 && (
                  <div className="h-px bg-slate-100 dark:bg-slate-800" />
                )}
              </React.Fragment>
            ))}

            <footer className="mt-8 border-t border-slate-100 pt-8 dark:border-slate-800">
              {showTelemetryPrompt && (
                <section
                  aria-labelledby="telemetry-consent-title"
                  className="mb-8 border-b border-slate-100 pb-8 dark:border-slate-800"
                >
                  <h2
                    id="telemetry-consent-title"
                    className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-900 uppercase dark:text-slate-200"
                  >
                    <Info className="size-4 text-blue-500" /> Anonymous diagnostics
                  </h2>
                  <p className="mb-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    If a scan check fails, may we send your browser engine and QR style settings to help improve QRCraftly? QR content and images are never sent.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleOptIn(true)} className="flex-1 text-xs">Allow</Button>
                    <Button variant="outline" size="sm" onClick={() => handleOptIn(false)} className="flex-1 text-xs">No thanks</Button>
                  </div>
                </section>
              )}
              <nav aria-label="Site Map">
                <div className="mb-4 grid grid-cols-2 gap-4">
                  <div>
                    <h2 className="mb-3 text-xs font-semibold tracking-wider text-slate-900 uppercase dark:text-slate-200">Generators</h2>
                    <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                      <li><a href="/" className="transition-colors hover:text-teal-700 dark:hover:text-teal-400">URL QR Code</a></li>
                      <li><a href="/text-qr-code" className="transition-colors hover:text-teal-700 dark:hover:text-teal-400">Text QR Code</a></li>
                      <li><a href="/wifi-qr-code" className="transition-colors hover:text-teal-700 dark:hover:text-teal-400">WiFi QR Code</a></li>
                      <li><a href="/vcard-qr-code" className="transition-colors hover:text-teal-700 dark:hover:text-teal-400">vCard QR Code</a></li>
                      <li><a href="/email-qr-code" className="transition-colors hover:text-teal-700 dark:hover:text-teal-400">Email QR Code</a></li>
                      <li><a href="/phone-qr-code" className="transition-colors hover:text-teal-700 dark:hover:text-teal-400">Phone QR Code</a></li>
                      <li><a href="/sms-qr-code" className="transition-colors hover:text-teal-700 dark:hover:text-teal-400">SMS QR Code</a></li>
                      <li><a href="/payment-qr-code" className="transition-colors hover:text-teal-700 dark:hover:text-teal-400">Payment QR Code</a></li>
                      <li><a href="/event-qr-code" className="transition-colors hover:text-teal-700 dark:hover:text-teal-400">Event QR Code</a></li>
                      <li><a href="/location-qr-code" className="transition-colors hover:text-teal-700 dark:hover:text-teal-400">Location QR Code</a></li>
                      <li><a href="/meeting-qr-code" className="transition-colors hover:text-teal-700 dark:hover:text-teal-400">Meeting QR Code</a></li>
                      <li><a href="/social-qr-code" className="transition-colors hover:text-teal-700 dark:hover:text-teal-400">Social QR Code</a></li>
                      <li><a href="/file-transfer" className="font-semibold text-teal-700 transition-colors hover:text-teal-800 dark:text-teal-300 dark:hover:text-teal-200">File Share (Send)</a></li>
                      <li><a href="/file-transfer/receive" className="font-semibold text-teal-700 transition-colors hover:text-teal-800 dark:text-teal-300 dark:hover:text-teal-200">File Share (Receive)</a></li>
                      <li>
                        <a href="/file-transfer" className="inline-flex items-center gap-1.5 font-semibold text-teal-700 transition-colors hover:text-teal-800 dark:text-teal-300 dark:hover:text-teal-200">
                          <span>File Share (Send)</span>
                          <span className="rounded-full bg-teal-100 px-1.5 py-0.5 text-[10px] font-semibold text-teal-800 dark:bg-teal-900/60 dark:text-teal-300">Beta</span>
                        </a>
                      </li>
                      <li>
                        <a href="/file-transfer/receive" className="inline-flex items-center gap-1.5 font-semibold text-teal-700 transition-colors hover:text-teal-800 dark:text-teal-300 dark:hover:text-teal-200">
                          <span>File Share (Receive)</span>
                          <span className="rounded-full bg-teal-100 px-1.5 py-0.5 text-[10px] font-semibold text-teal-800 dark:bg-teal-900/60 dark:text-teal-300">Beta</span>
                        </a>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h2 className="mb-3 text-xs font-semibold tracking-wider text-slate-900 uppercase dark:text-slate-200">Company</h2>
                    <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                      <li><a href="/about" className="transition-colors hover:text-teal-700 dark:hover:text-teal-400">About</a></li>
                      <li><a href="/security#security-policy" className="transition-colors hover:text-teal-700 dark:hover:text-teal-400">Security Policy</a></li>
                      <li><a href="/security#privacy-architecture" className="transition-colors hover:text-teal-700 dark:hover:text-teal-400">Privacy Architecture</a></li>
                      <li><a href="https://ko-fi.com/laser_loon" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-teal-700 dark:hover:text-teal-400">Ko-fi</a></li>
                      <li><a href="https://github.com/fderuiter/QRCraftly" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-teal-700 dark:hover:text-teal-400">GitHub</a></li>
                    </ul>
                  </div>
                </div>
              </nav>
              <p className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                &copy; {new Date().getFullYear()} QRCraftly. Open Source.
              </p>
            </footer>
          </div>
        </aside>

        {/* Preview Area */}
        <section aria-label="QR Code Preview" className="relative flex flex-1 flex-col items-center justify-center overflow-x-hidden bg-slate-50 p-4 transition-colors duration-300 md:sticky md:top-0 md:h-[100dvh] md:justify-start md:overflow-y-auto md:p-8 dark:bg-slate-950">
           {/* Background Decoration */}
           <div className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-20">
               <div className="absolute top-0 left-0 size-96 -translate-1/2 rounded-full bg-teal-200 blur-3xl transition-colors duration-300 dark:bg-teal-900"></div>
               <div className="absolute right-0 bottom-0 size-96 translate-1/2 rounded-full bg-slate-300 blur-3xl transition-colors duration-300 dark:bg-slate-800"></div>
           </div>

          <div className="relative z-10 w-full max-w-md">
             <Card className="hover:scale-1.01 transform transition-all duration-300">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="font-semibold text-slate-700 dark:text-slate-200">Live Preview</h2>
                    <ScannabilityIndicator status={scannabilityStatus} health={health} />
                </div>
                
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

                <div className="grid w-full grid-cols-1 gap-3">
                   {/* Row 1: Download & Share */}
                   <div className="flex gap-2">
                       <div className="relative flex-1" ref={downloadMenuRef}>
                          <Button 
                              ref={downloadButtonRef}
                              variant={getExportRiskPolicy({ status: scannabilityStatus, health }) === 'unsafe' ? 'error' : 'primary'}
                              fullWidth
                              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                              aria-expanded={showDownloadMenu}
                              aria-haspopup="true"
                          >
                              <Download className="size-4" />
                              Download
                              <ChevronDown className="ml-auto size-4 opacity-80" />
                          </Button>
                          
                          {showDownloadMenu && (
                              <div className="animate-in fade-in zoom-in-95 absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-100 bg-white py-1 shadow-xl duration-100 dark:border-slate-700 dark:bg-slate-800" role="menu">
                                  <Button onClick={() => executeWithSafetyGate(() => handleSaveAsFlow('png'))} role="menuitem" variant="menuitem">
                                      <div className="size-1.5 rounded-full bg-teal-500"></div> PNG (High Quality)
                                  </Button>
                                  <Button onClick={() => executeWithSafetyGate(() => handleSaveAsFlow('jpeg'))} role="menuitem" variant="menuitem">
                                      <div className="size-1.5 rounded-full bg-blue-500"></div> JPEG (Compact)
                                  </Button>
                                  <Button onClick={() => executeWithSafetyGate(() => handleSaveAsFlow('webp'))} role="menuitem" variant="menuitem">
                                      <div className="size-1.5 rounded-full bg-purple-500"></div> WebP (Modern)
                                  </Button>
                                  <div className="my-1 h-px bg-slate-100 dark:bg-slate-700" role="separator" />
                                  <Button onClick={() => executeWithSafetyGate(handleSaveSvgFlow)} role="menuitem" variant="menuitem">
                                      <div className="size-1.5 rounded-full bg-orange-500"></div> SVG (Vector)
                                  </Button>
                              </div>
                          )}
                       </div>
                       
                       <Button
                          ref={copyButtonRef}
                          variant="secondary"
                          onClick={onCopy}
                          className="w-12 px-0"
                          title="Copy Image"
                          aria-label={copied ? "Copied to clipboard" : "Copy QR code to clipboard"}
                       >
                          {copied ? <Check className="size-5 text-emerald-500" /> : <Copy className="size-5" />}
                       </Button>

                       {canShare && (
                         <Button 
                            ref={shareButtonRef}
                            variant="secondary"
                            onClick={onShare}
                            className="w-12 px-0"
                            title="Share"
                            aria-label="Share QR code"
                         >
                            <Share2 className="size-5" />
                         </Button>
                       )}
                   </div>

                   {/* Row 2: Quick PNG download */}
                   <Button 
                      ref={photosButtonRef}
                      variant="outline"
                      fullWidth
                      onClick={() => executeWithSafetyGate(() => downloadToDeviceFlow('png', photosButtonRef))}
                      aria-label="Download QR code as PNG"
                   >
                      <Download className="size-4" />
                      Download PNG
                   </Button>

                </div>
             </Card>
          </div>
        </section>
      </div>
    </div>
  );
}

/**
 *
 * @param root0
 * @param root0.initialConfig
 * @param root0.title
 * @param root0.toolId
 */
export default function QRTool({ initialConfig, title, toolId = 'index' }: { initialConfig?: Partial<QRConfig>, title?: string, toolId?: string }) {
  return (
    <QRProvider initialConfig={initialConfig}>
      <QRToolInner title={title} toolId={toolId} />
    </QRProvider>
  );
}
