import React, { useState, useRef } from 'react';
import { QRConfig } from '@/types';
import { DEFAULT_CONFIG } from '@/constants';
import InputPanel from '@/components/InputPanel';
import StyleControls from '@/components/StyleControls';
import QRCanvas from '@/components/QRCanvas';
import { Download, Share2, QrCode, ChevronDown, Camera, Moon, Sun, Info } from 'lucide-react';

/**
 * The main Application component.
 * Manages the global state for the QR code configuration and coordinates
 * the input panel, style controls, and the preview canvas.
 * Handles downloading and sharing of the generated QR code.
 *
 * @param props - The component props.
 * @param props.initialConfig - Optional initial configuration for the QR code.
 * @returns The QRTool component.
 */
export default function QRTool({ initialConfig }: { initialConfig?: Partial<QRConfig> }) {
  const [config, setConfig] = useState<QRConfig>({ ...DEFAULT_CONFIG, ...initialConfig });
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  /**
   * Updates the QR configuration state.
   * @param updates - Partial configuration object to merge into the current state.
   */
  const handleConfigChange = (updates: Partial<QRConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  /**
   * Toggles the application between light and dark mode.
   */
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  /**
   * Helper function to normalize file extensions.
   * @param format - The image format ('png', 'jpeg', 'webp').
   * @returns The corresponding file extension (e.g., 'jpg' for 'jpeg').
   */
  const getExtension = (format: 'png' | 'jpeg' | 'webp') => {
    return format === 'jpeg' ? 'jpg' : format;
  };

  /**
   * Generates an SEO-friendly filename based on the current QR code type and date.
   * @param ext - The file extension.
   * @returns The generated filename string.
   */
  const getFilename = (ext: string) => {
    const type = config.type.toLowerCase();
    const date = new Date().toISOString().split('T')[0];
    return `${type}-qr-code-qrcraftly-${date}.${ext}`;
  };

  /**
   * Downloads the current QR code canvas content to the user's device.
   * Used as a fallback or direct action for saving to photos.
   * @param format - The desired image format.
   */
  const downloadToDevice = (format: 'png' | 'jpeg' | 'webp') => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (canvas) {
      const url = canvas.toDataURL(`image/${format}`);
      const link = document.createElement('a');
      const ext = getExtension(format);
      link.download = getFilename(ext);
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setShowDownloadMenu(false);
    }
  };

  /**
   * Handles saving the QR code image, attempting to use the File System Access API
   * for a native "Save As" experience, falling back to direct download if unsupported.
   * @param format - The desired image format.
   */
  const handleSaveAs = async (format: 'png' | 'jpeg' | 'webp') => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;

    setShowDownloadMenu(false);

    // Check if the browser supports the File System Access API (e.g., Chrome, Edge Desktop)
    if ('showSaveFilePicker' in window) {
      try {
        const blob = await new Promise<Blob | null>((resolve) => 
          canvas.toBlob(resolve, `image/${format}`)
        );
        
        if (!blob) throw new Error('Failed to create image blob');

        const ext = getExtension(format);
        
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: getFilename(ext),
          types: [{
            description: 'QR Code Image',
            accept: { [`image/${format}`]: [`.${ext}`] },
          }],
        });

        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      } catch (err: any) {
        // If user aborted the picker, do nothing.
        if (err.name === 'AbortError') return;
        
        console.warn('File System Access API failed, falling back to standard download:', err);
        downloadToDevice(format);
      }
    } else {
      // Fallback for browsers that don't support showSaveFilePicker (Safari, Firefox, Mobile)
      downloadToDevice(format);
    }
  };

  /**
   * Uses the Web Share API to share the QR code image directly to other apps.
   * Falls back to downloading if sharing is not supported.
   */
  const handleShare = async () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (canvas) {
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const file = new File([blob], 'qrcode.png', { type: 'image/png' });

        if (navigator.share && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: 'QRCraftly Code',
              text: 'Here is a QR code I created with QRCraftly!',
              files: [file],
            });
          } catch (error) {
            console.log('Error sharing:', error);
          }
        } else {
          // Fallback for devices that don't support sharing files
          alert("Sharing is not supported on this device/browser. The image will be downloaded instead.");
          downloadToDevice('png');
        }
      }, 'image/png');
    }
  };

  return (
    <div className={`${isDarkMode ? 'dark' : ''} h-full w-full`}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col-reverse md:flex-row transition-colors duration-300">
        {/* Sidebar Controls */}
        <div className="w-full md:w-[480px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-auto md:h-screen overflow-y-auto flex flex-col shadow-xl z-10 transition-colors duration-300">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-20 flex justify-between items-center transition-colors duration-300">
            <div>
              <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400 mb-1">
                <QrCode className="w-6 h-6" />
                <h1 className="text-xl font-bold tracking-tight text-slate-700 dark:text-slate-100">QRCraftly</h1>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Design beautiful QR codes in seconds.</p>
            </div>
            
            <div className="flex gap-2">
              <a
                href="/about"
                className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="About Us"
              >
                <Info className="w-5 h-5" />
              </a>
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="p-6 space-y-8 pb-24">
            <section>
              <h2 className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-4">Content</h2>
              <InputPanel config={config} onChange={handleConfigChange} />
            </section>

            <div className="h-px bg-slate-100 dark:bg-slate-800" />

            <section>
              <h2 className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-4">Appearance</h2>
              <StyleControls config={config} onChange={handleConfigChange} />
            </section>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden transition-colors duration-300">
           {/* Background Decoration */}
           <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20">
               <div className="absolute top-0 left-0 w-96 h-96 bg-teal-200 dark:bg-teal-900 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 transition-colors duration-300"></div>
               <div className="absolute bottom-0 right-0 w-96 h-96 bg-slate-300 dark:bg-slate-800 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 transition-colors duration-300"></div>
           </div>

          <div className="relative z-10 max-w-md w-full">
             <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 border border-slate-200 dark:border-slate-800 transform transition-all hover:scale-[1.01] duration-300">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-semibold text-slate-700 dark:text-slate-200">Live Preview</h3>
                    <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-full border border-emerald-200 dark:border-emerald-800">Active</span>
                </div>
                
                <div ref={qrRef} className="flex justify-center mb-8">
                   <QRCanvas config={config} className="w-full aspect-square rounded-lg shadow-sm" />
                </div>

                <div className="grid grid-cols-1 gap-3 w-full">
                   {/* Row 1: Download & Share */}
                   <div className="flex gap-2">
                       <div className="relative flex-1">
                          <button 
                              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-teal-700 dark:bg-teal-700 text-white rounded-xl font-medium hover:bg-teal-800 dark:hover:bg-teal-600 transition-colors shadow-lg shadow-teal-900/10 dark:shadow-teal-900/40"
                          >
                              <Download className="w-4 h-4" />
                              Download
                              <ChevronDown className="w-4 h-4 ml-auto opacity-80" />
                          </button>
                          
                          {showDownloadMenu && (
                              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 py-1 z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                                  <button onClick={() => handleSaveAs('png')} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 text-sm font-medium flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-teal-500"></div> PNG (High Quality)
                                  </button>
                                  <button onClick={() => handleSaveAs('jpeg')} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 text-sm font-medium flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> JPEG (Compact)
                                  </button>
                                  <button onClick={() => handleSaveAs('webp')} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 text-sm font-medium flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div> WebP (Modern)
                                  </button>
                              </div>
                          )}
                       </div>
                       
                       <button 
                          onClick={handleShare}
                          className="flex items-center justify-center w-12 bg-teal-50 dark:bg-slate-800 border border-teal-200 dark:border-slate-700 text-teal-700 dark:text-teal-400 rounded-xl font-medium hover:bg-teal-100 dark:hover:bg-slate-700 transition-colors"
                          title="Share"
                       >
                          <Share2 className="w-5 h-5" />
                       </button>
                   </div>

                   {/* Row 2: Save to Camera Roll */}
                   <button 
                      onClick={() => downloadToDevice('png')}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                   >
                      <Camera className="w-4 h-4" />
                      Save to Photos
                   </button>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
