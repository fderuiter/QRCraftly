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
import { QRConfig } from '@/types';
import QRCanvas from '@/components/QRCanvas';
import { Download, Share2, QrCode, ChevronDown, Camera, Moon, Sun, Info, Copy, Check, AlertTriangle } from 'lucide-react';
import { Modal } from './ui/Modal';
import { useDebounce, useOnClickOutside } from '@/utils/hooks';
import { useQRDownload } from '@/utils/useQRDownload';
import { useScannability } from '@/hooks/useScannability';
import { ScannabilityIndicator } from '@/components/ScannabilityIndicator';
import { QRProvider, useQRStore, useQRStoreSelector } from '@/context/QRContext';
import { useTheme } from '@/hooks/useTheme';
import { useTelemetry } from '@/hooks/useTelemetry';
import { useCapabilities } from '@/hooks/useCapabilities';
import { sidebarControls } from '@/registry';

/**
 * Renders the QR code generator interface with configuration controls, preview, and export actions.
 *
 * @param title - Optional title used for the generator heading and branding.
 * @param toolId - Identifier passed to the sidebar controls.
 * @returns The QR code generator interface.
 */
function QRToolInner({ title, toolId = 'index' }: { title?: string, toolId?: string }) {
  const config = useQRStoreSelector(s => s.config);
  const store = useQRStore();
  const emitSignal = store.emitSignal;
  const { isDarkMode, toggleDarkMode } = useTheme();
  
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [showSafetyGate, setShowSafetyGate] = useState(false);
  const [gateAction, setGateAction] = useState<(() => void) | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  const { downloadToDevice: hookDownload, handleSaveAs: hookSaveAs, handleSaveSvg: hookSaveSvg, handleShare, handleCopy } = useQRDownload(qrRef, config);
  const [copied, setCopied] = useState(false);
  const { canShare } = useCapabilities();

  // Scannability & Telemetry
  const { status: scannabilityStatus, checkScannability, health } = useScannability(canvasRef, config);

  
  const handleRendered = useCallback((info: { moduleCount: number, virtualImageData?: ImageData } = { moduleCount: 0 }) => {
    if (info.moduleCount && !info.virtualImageData) emitSignal('render-complete', info);
    if (info.virtualImageData) {
      checkScannability(info.virtualImageData);
    } else if (!info.virtualImageData && !info.moduleCount) {
      checkScannability();
    }
  }, [emitSignal, checkScannability]);
  const { showTelemetryPrompt, handleOptIn } = useTelemetry(scannabilityStatus);

  // Close download menu when clicking outside
  const closeDownloadMenu = useCallback(() => setShowDownloadMenu(false), []);
  useOnClickOutside(downloadMenuRef, closeDownloadMenu, showDownloadMenu);

  // Debounce the config for QRCanvas to prevent lag during rapid typing or style changes.
  const debouncedConfig = useDebounce(config, 100);

  const onCopy = async () => {
    const success = await handleCopy();
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const executeWithSafetyGate = (action: () => void) => {
    if (scannabilityStatus === 'fail' || scannabilityStatus === 'digital-pass') {
      setGateAction(() => action);
      setShowSafetyGate(true);
    } else {
      action();
    }
  };

  const downloadToDevice = (format: 'png' | 'jpeg' | 'webp') => {
    setShowDownloadMenu(false);
    executeWithSafetyGate(() => hookDownload(format));
  };

  const handleSaveAs = async (format: 'png' | 'jpeg' | 'webp') => {
    setShowDownloadMenu(false);
    await hookSaveAs(format);
  };

  const handleSaveSvg = async () => {
    setShowDownloadMenu(false);
    try {
      await hookSaveSvg();
    } catch (err) {}
  };

  return (
    <div className={`${isDarkMode ? 'dark' : ''} w-full`} id="top">
      <Modal isOpen={showSafetyGate} onClose={() => setShowSafetyGate(false)} title="Scan Safety Warning">
        <div className="flex flex-col items-center text-center gap-4">
          <AlertTriangle className="w-12 h-12 text-amber-500" />
          <p className="text-slate-700 dark:text-slate-300">
            This QR code might fail to scan in real-world conditions. We recommend adjusting colors, pattern, or margin for better contrast.
          </p>
          <div className="flex gap-3 mt-4 w-full">
             <Button variant="outline" fullWidth onClick={() => setShowSafetyGate(false)}>Go Back</Button>
             <Button variant="primary" fullWidth onClick={() => {
               setShowSafetyGate(false);
               if (gateAction) gateAction();
             }}>Export Anyway</Button>
          </div>
        </div>
      </Modal>
      <h1 className="sr-only">{title ? `${title} Generator` : "Free Custom QR Code Generator"}</h1>
      <div className="min-h-screen md:h-[100dvh] md:overflow-hidden bg-slate-50 dark:bg-slate-950 flex flex-col-reverse md:flex-row transition-colors duration-300 relative">
        {/* Sidebar Controls */}
        <section aria-label="QR Code Settings" className="w-full md:w-[480px] md:h-full md:overflow-y-auto bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shadow-xl z-10 transition-colors duration-300 relative">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-20 flex justify-between items-center transition-colors duration-300">
            <div>
              <a href="/" aria-label="QRCraftly Home" className="flex items-center gap-2 text-teal-700 dark:text-teal-400 mb-1 hover:opacity-80 transition-opacity">
                <QrCode className="w-6 h-6" />
                <span className="text-xl font-bold tracking-tight text-slate-700 dark:text-slate-100">{title || "QRCraftly"}</span>
              </a>
              <p className="text-sm text-slate-600 dark:text-slate-400">Design beautiful QR codes in seconds.</p>
            </div>
            
            <div className="flex gap-2">
              <a
                href="#content-section"
                className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="About Us"
                aria-label="About QRCraftly"
              >
                <Info className="w-5 h-5" />
              </a>
              <Button
                variant="icon"
                size="icon"
                onClick={toggleDarkMode}
                className="rounded-full"
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          <div className="p-6 space-y-8 pb-24">
            {sidebarControls.map((Control, index) => (
              <React.Fragment key={Control.id}>
                <Control.component toolId={toolId} />
                {index < sidebarControls.length - 1 && (
                  <div className="h-px bg-slate-100 dark:bg-slate-800" />
                )}
              </React.Fragment>
            ))}

            <footer className="pt-8 mt-8 border-t border-slate-100 dark:border-slate-800">
              <nav aria-label="Site Map">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-3">Generators</h3>
                    <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                      <li><a href="/" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">URL QR Code</a></li>
                      <li><a href="/text-qr-code" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Text QR Code</a></li>
                      <li><a href="/wifi-qr-code" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">WiFi QR Code</a></li>
                      <li><a href="/vcard-qr-code" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">vCard QR Code</a></li>
                      <li><a href="/email-qr-code" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Email QR Code</a></li>
                      <li><a href="/phone-qr-code" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Phone QR Code</a></li>
                      <li><a href="/sms-qr-code" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">SMS QR Code</a></li>
                      <li><a href="/payment-qr-code" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Payment QR Code</a></li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-3">Company</h3>
                    <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                      <li><a href="/about" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">About</a></li>
                      <li><a href="/security#security-policy" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Security Policy</a></li>
                      <li><a href="/security#privacy-architecture" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Privacy Architecture</a></li>
                      <li><a href="https://ko-fi.com/laser_loon" target="_blank" rel="noopener noreferrer" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Ko-fi</a></li>
                      <li><a href="https://github.com/fderuiter/QRCraftly" target="_blank" rel="noopener noreferrer" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">GitHub</a></li>
                    </ul>
                  </div>
                </div>
              </nav>
              <p className="mt-6 text-xs text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-4">
                &copy; {new Date().getFullYear()} QRCraftly. Open Source.
              </p>
            </footer>
          </div>
        </section>

        {/* Preview Area */}
        <section aria-label="QR Code Preview" className="flex-1 bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden transition-colors duration-300 md:sticky md:top-0 md:h-screen">
           {/* Background Decoration */}
           <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20">
               <div className="absolute top-0 left-0 w-96 h-96 bg-teal-200 dark:bg-teal-900 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 transition-colors duration-300"></div>
               <div className="absolute bottom-0 right-0 w-96 h-96 bg-slate-300 dark:bg-slate-800 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 transition-colors duration-300"></div>
           </div>

          <div className="relative z-10 max-w-md w-full">
             <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 border border-slate-200 dark:border-slate-800 transform transition-all hover:scale-[1.01] duration-300">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-semibold text-slate-700 dark:text-slate-200">Live Preview</h3>
                    <div className="flex items-center gap-2">
                       <ScannabilityIndicator status={scannabilityStatus} health={health} />
                       <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-full border border-emerald-200 dark:border-emerald-800">Active</span>
                    </div>
                </div>
                
                <div ref={qrRef} className="flex justify-center mb-8">
                   {/* Pass debounced config to QRCanvas to prevent heavy rendering on every keystroke */}
                   <QRCanvas ref={canvasRef} onRendered={handleRendered} config={debouncedConfig} className="w-full max-h-[60vh] object-contain rounded-lg shadow-sm" />
                </div>

                <div className="grid grid-cols-1 gap-3 w-full">
                   {/* Row 1: Download & Share */}
                   <div className="flex gap-2">
                       <div className="relative flex-1" ref={downloadMenuRef}>
                          <Button 
                              variant={scannabilityStatus === 'fail' || scannabilityStatus === 'digital-pass' ? 'error' : 'primary'}
                              fullWidth
                              onClick={() => executeWithSafetyGate(() => setShowDownloadMenu(!showDownloadMenu))}
                              aria-expanded={showDownloadMenu}
                              aria-haspopup="true"
                          >
                              <Download className="w-4 h-4" />
                              Download
                              <ChevronDown className="w-4 h-4 ml-auto opacity-80" />
                          </Button>
                          
                          {showDownloadMenu && (
                              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 py-1 z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden" role="menu">
                                  <Button onClick={() => handleSaveAs('png')} role="menuitem" variant="menuitem">
                                      <div className="w-1.5 h-1.5 rounded-full bg-teal-500"></div> PNG (High Quality)
                                  </Button>
                                  <Button onClick={() => handleSaveAs('jpeg')} role="menuitem" variant="menuitem">
                                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> JPEG (Compact)
                                  </Button>
                                  <Button onClick={() => handleSaveAs('webp')} role="menuitem" variant="menuitem">
                                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div> WebP (Modern)
                                  </Button>
                                  <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" role="separator" />
                                  <Button onClick={handleSaveSvg} role="menuitem" variant="menuitem">
                                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div> SVG (Vector)
                                  </Button>
                              </div>
                          )}
                       </div>
                       
                       <Button
                          variant="secondary"
                          onClick={onCopy}
                          className="w-12 px-0"
                          title="Copy Image"
                          aria-label={copied ? "Copied to clipboard" : "Copy QR code to clipboard"}
                       >
                          {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                       </Button>

                       {canShare && (
                         <Button 
                            variant="secondary"
                            onClick={handleShare}
                            className="w-12 px-0"
                            title="Share"
                            aria-label="Share QR code"
                         >
                            <Share2 className="w-5 h-5" />
                         </Button>
                       )}
                   </div>

                   {/* Row 2: Save to Camera Roll */}
                   <Button 
                      variant="outline"
                      fullWidth
                      onClick={() => downloadToDevice('png')}
                      aria-label="Save QR code to photos"
                   >
                      <Camera className="w-4 h-4" />
                      Save to Photos
                   </Button>

                   {showTelemetryPrompt && (
                      <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-sm">
                         <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
                           <Info className="w-4 h-4 text-blue-500" /> Help Improve Scannability
                         </h4>
                         <p className="text-slate-600 dark:text-slate-400 mb-3 text-xs leading-relaxed">
                           We noticed your QR code might be hard to scan. Would you like to send an anonymous telemetry ping to help us fix bugs?
                           <br/><br/>
                           <strong>Privacy Guarantee:</strong> We only send your device engine and style settings. We <strong>never</strong> send the QR content or image.
                         </p>
                         <div className="flex gap-2">
                           <Button variant="primary" size="sm" onClick={() => handleOptIn(true)} className="flex-1 text-xs">Yes, Help Fix This</Button>
                           <Button variant="outline" size="sm" onClick={() => handleOptIn(false)} className="flex-1 text-xs">No Thanks</Button>
                         </div>
                      </div>
                   )}
                </div>
             </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function QRTool({ initialConfig, title, toolId = 'index' }: { initialConfig?: Partial<QRConfig>, title?: string, toolId?: string }) {
  return (
    <QRProvider initialConfig={initialConfig}>
      <QRToolInner title={title} toolId={toolId} />
    </QRProvider>
  );
}
