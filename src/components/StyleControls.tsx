
import React, { useRef, useMemo, useState } from 'react';
import { QRConfig, QRStyle, LogoPaddingStyle } from '../types';
import { PATTERNS, PRESET_COLORS } from '../constants';
import { Upload, X, AlertTriangle, Circle, Square, Minus, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Props for the StyleControls component.
 */
interface StyleControlsProps {
  /** The current QR code configuration. */
  config: QRConfig;
  /** Callback to update the configuration. */
  onChange: (updates: Partial<QRConfig>) => void;
}

/**
 * Utility to calculate relative luminance of a color.
 * Used for contrast ratio calculation.
 * @param hex - The hex color code (e.g. #RRGGBB).
 * @returns The relative luminance value.
 */
const getLuminance = (hex: string) => {
  const rgb = parseInt(hex.slice(1), 16);
  const r = ((rgb >> 16) & 0xff) / 255;
  const g = ((rgb >> 8) & 0xff) / 255;
  const b = (rgb & 0xff) / 255;

  const a = [r, g, b].map((v) => {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
};

/**
 * Calculates the contrast ratio between two colors.
 * @param fg - Foreground color hex.
 * @param bg - Background color hex.
 * @returns The contrast ratio (1 to 21).
 */
const getContrastRatio = (fg: string, bg: string) => {
    if (!fg || !bg || fg.length !== 7 || bg.length !== 7) return 0;
    const l1 = getLuminance(fg);
    const l2 = getLuminance(bg);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
};

/**
 * A component providing UI controls for styling the QR code.
 * Allows users to change patterns, colors, and upload logos.
 * Also checks and warns about low contrast ratios.
 *
 * @param props - The component props.
 * @param props.config - The current configuration.
 * @param props.onChange - Callback to update configuration.
 * @returns The StyleControls component.
 */
const StyleControls: React.FC<StyleControlsProps> = ({ config, onChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const borderLogoInputRef = useRef<HTMLInputElement>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  /**
   * Handles the file upload for the center logo.
   * Reads the file as a Data URL and updates the config.
   * @param e - The change event from the file input.
   */
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onChange({ logoUrl: event.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  /**
   * Handles the file upload for the border logo.
   */
  const handleBorderLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onChange({ borderLogoUrl: event.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const contrastRatios = useMemo(() => {
      const fgContrast = getContrastRatio(config.fgColor, config.bgColor);
      const eyeContrast = getContrastRatio(config.eyeColor, config.bgColor);
      const borderTextContrast = config.isBorderEnabled && config.borderText
          ? getContrastRatio(config.borderTextColor, config.borderColor)
          : 21; // Default to max if not relevant
      return { fg: fgContrast, eye: eyeContrast, borderText: borderTextContrast };
  }, [config.fgColor, config.bgColor, config.eyeColor, config.isBorderEnabled, config.borderText, config.borderTextColor, config.borderColor]);

  // Increased sensitivity threshold to 4.5 (WCAG AA for text, better for scanning)
  const isLowContrast = contrastRatios.fg < 4.5 || contrastRatios.eye < 4.5;
  const worstContrast = Math.min(contrastRatios.fg, contrastRatios.eye);

  const isLowBorderContrast = contrastRatios.borderText < 4.5;

  return (
    <div className="space-y-8">
      {/* Border Controls */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Border</h3>
            <div className="flex items-center">
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={config.isBorderEnabled}
                        onChange={(e) => onChange({ isBorderEnabled: e.target.checked })}
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-300 dark:peer-focus:ring-teal-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-teal-600"></div>
                </label>
            </div>
        </div>

        {config.isBorderEnabled && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label htmlFor="border-style" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                            Style
                        </label>
                        <select
                            id="border-style"
                            value={config.borderStyle || 'solid'}
                            onChange={(e) => onChange({ borderStyle: e.target.value as any })}
                            className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                        >
                            <option value="solid">Solid</option>
                            <option value="dashed">Dashed</option>
                            <option value="dotted">Dotted</option>
                            <option value="double">Double</option>
                        </select>
                    </div>
                     <div>
                        <label htmlFor="border-size" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                            Width
                        </label>
                        <input
                            id="border-size"
                            type="range"
                            min="0.01"
                            max="0.15"
                            step="0.005"
                            value={config.borderSize}
                            onChange={(e) => onChange({ borderSize: parseFloat(e.target.value) })}
                            className="w-full accent-teal-700 dark:accent-teal-500"
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="border-color" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                        Border Color
                    </label>
                    <div className="flex items-center gap-2">
                        <input
                            id="border-color"
                            type="color"
                            value={config.borderColor}
                            onChange={(e) => onChange({ borderColor: e.target.value })}
                            className="w-10 h-10 rounded cursor-pointer border-0 p-0 bg-transparent"
                        />
                        <span className="text-xs text-slate-600 dark:text-slate-300 font-mono">{config.borderColor}</span>
                    </div>
                </div>

                {/* Border Content Section */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                     <div className="flex justify-between items-baseline mb-2">
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Content</p>
                        {isLowBorderContrast && (
                             <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                 <AlertTriangle className="w-3 h-3" />
                                 Low Contrast ({contrastRatios.borderText.toFixed(1)})
                             </span>
                        )}
                     </div>

                     {/* Border Text */}
                     <div className="space-y-2 mb-3">
                         <input
                            type="text"
                            placeholder="Text on border..."
                            value={config.borderText}
                            onChange={(e) => onChange({ borderText: e.target.value })}
                            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                         />
                         <div className="flex gap-2">
                             <select
                                value={config.borderTextPosition || 'bottom-center'}
                                onChange={(e) => onChange({ borderTextPosition: e.target.value as any })}
                                className="flex-1 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                            >
                                <option value="top-center">Top Center</option>
                                <option value="bottom-center">Bottom Center</option>
                            </select>
                             <div className="flex items-center gap-1">
                                <input
                                    type="color"
                                    value={config.borderTextColor || '#ffffff'}
                                    onChange={(e) => onChange({ borderTextColor: e.target.value })}
                                    className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent"
                                    title="Text Color"
                                />
                            </div>
                         </div>
                     </div>

                     {/* Border Logo */}
                     <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                             {config.borderLogoUrl ? (
                                 <img src={config.borderLogoUrl} alt="Border Logo" className="w-8 h-8 object-contain bg-white rounded border border-slate-200" />
                             ) : (
                                 <span className="text-xs text-slate-500 dark:text-slate-400 italic">No secondary logo</span>
                             )}
                             {config.borderLogoUrl && (
                                <button onClick={() => onChange({ borderLogoUrl: null })} className="text-xs text-rose-600 hover:underline">
                                    <X className="w-3 h-3"/>
                                </button>
                             )}
                         </div>
                         <button
                            onClick={() => borderLogoInputRef.current?.click()}
                            className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-medium flex items-center gap-1"
                         >
                             <Upload className="w-3 h-3" />
                             {config.borderLogoUrl ? 'Change' : 'Add Logo'}
                         </button>
                         <input
                            ref={borderLogoInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleBorderLogoUpload}
                         />
                     </div>
                     {config.borderLogoUrl && (
                        <div className="mt-2">
                            <select
                                value={config.borderLogoPosition || 'bottom-center'}
                                onChange={(e) => onChange({ borderLogoPosition: e.target.value as any })}
                                className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                            >
                                <option value="bottom-center">Bottom Center</option>
                                <option value="bottom-right">Bottom Right</option>
                            </select>
                        </div>
                     )}
                </div>
            </div>
        )}
      </div>

      {/* Pattern Style */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Pattern Style</h3>
        <div className="grid grid-cols-4 gap-3">
          {PATTERNS.map((pattern) => (
            <button
              key={pattern.id}
              onClick={() => onChange({ style: pattern.id })}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                config.style === pattern.id
                  ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-500 dark:text-slate-400'
              }`}
            >
              <div className="w-8 h-8 mb-2 grid grid-cols-2 gap-0.5 p-1">
                  {[1, 2, 3, 4].map((i) => {
                      if (pattern.id === QRStyle.STARBURST) {
                         return (
                             <div key={i} className="flex items-center justify-center">
                                 <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                                     <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                 </svg>
                             </div>
                         );
                      }
                      if (pattern.id === QRStyle.HIVE) {
                          // Hexagon clip path
                          return (
                              <div key={i} className="flex items-center justify-center bg-current" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
                          );
                      }
                      if (pattern.id === QRStyle.SWISS) {
                           return <div key={i} className="bg-current rounded-full" />;
                      }
                      if (pattern.id === QRStyle.MODERN) {
                           return <div key={i} className="bg-current rounded-sm" />;
                      }
                      if (pattern.id === QRStyle.FLUID) {
                           return <div key={i} className="bg-current rounded-lg" style={{ borderRadius: '50%' }} />;
                      }
                      if (pattern.id === QRStyle.CIRCUIT) {
                           return (
                             <div key={i} className="relative w-full h-full bg-transparent flex items-center justify-center">
                                <div className="w-1.5 h-1.5 bg-current rounded-full" />
                                <div className="absolute inset-0 border border-current opacity-50" />
                             </div>
                           );
                      }
                      if (pattern.id === QRStyle.GRUNGE) {
                           return <div key={i} className="bg-current" style={{ clipPath: 'polygon(10% 0, 100% 10%, 90% 100%, 0 90%)' }} />;
                      }
                      // Standard and others
                      return (
                        <div key={i} className="bg-current" />
                    );
                  })}
              </div>
              <span className="text-xs font-medium text-center leading-tight">{pattern.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Colors */}
      <div>
        <div className="flex justify-between items-baseline mb-3">
             <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Colors</h3>
             {isLowContrast && (
                 <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                     <AlertTriangle className="w-3 h-3" />
                     Low Contrast ({worstContrast.toFixed(1)})
                 </span>
             )}
        </div>
        
        <div className="flex flex-wrap gap-3 mb-5">
          {PRESET_COLORS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => onChange({ fgColor: preset.fg, bgColor: preset.bg, eyeColor: preset.eye })}
              className="group relative w-10 h-10 rounded-lg shadow-sm hover:scale-110 transition-transform duration-200 ring-1 ring-slate-200 dark:ring-slate-700 overflow-hidden"
              title={preset.label}
            >
              {/* Background */}
              <div className="absolute inset-0" style={{ backgroundColor: preset.bg }}></div>
              
              {/* Foreground Ring (Simulating Modules) */}
              <div className="absolute inset-1.5 border-[3px] rounded-sm" style={{ borderColor: preset.fg }}></div>
              
              {/* Eye Center */}
              <div className="absolute inset-[11px] rounded-[1px]" style={{ backgroundColor: preset.eye }}></div>
            </button>
          ))}
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="fg-color" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Foreground</label>
            <div className="flex items-center gap-2">
                <input
                id="fg-color"
                type="color"
                value={config.fgColor}
                onChange={(e) => onChange({ fgColor: e.target.value })}
                className="w-10 h-10 rounded cursor-pointer border-0 p-0 bg-transparent"
                />
                <span className="text-xs text-slate-600 dark:text-slate-300 font-mono">{config.fgColor}</span>
            </div>
          </div>
          <div>
            <label htmlFor="bg-color" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Background</label>
            <div className="flex items-center gap-2">
                <input
                id="bg-color"
                type="color"
                value={config.bgColor}
                onChange={(e) => onChange({ bgColor: e.target.value })}
                className="w-10 h-10 rounded cursor-pointer border-0 p-0 bg-transparent"
                />
                <span className="text-xs text-slate-600 dark:text-slate-300 font-mono">{config.bgColor}</span>
            </div>
          </div>
           <div className="col-span-2">
            <label htmlFor="eye-color" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Eye Color (Corners)</label>
            <div className="flex items-center gap-2">
                <input
                id="eye-color"
                type="color"
                value={config.eyeColor}
                onChange={(e) => onChange({ eyeColor: e.target.value })}
                className="w-10 h-10 rounded cursor-pointer border-0 p-0 bg-transparent"
                />
                <span className="text-xs text-slate-600 dark:text-slate-300 font-mono">{config.eyeColor}</span>
            </div>
          </div>
        </div>
        {isLowContrast && (
            <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg text-xs text-amber-800 dark:text-amber-400">
                Warning: The contrast ratio is low ({worstContrast.toFixed(2)}). QR codes should have high contrast (aim for 4.5:1) to be scannable by all devices.
            </div>
        )}
      </div>

      {/* Logo */}
      <div>
        <div className="flex justify-between items-center mb-3">
             <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Logo</h3>
             {config.logoUrl && (
                 <button onClick={() => onChange({ logoUrl: null })} className="text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1">
                     <X className="w-3 h-3"/> Remove
                 </button>
             )}
        </div>
       
        {!config.logoUrl ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-teal-50 dark:hover:bg-teal-900/10 hover:border-teal-400 dark:hover:border-teal-600 hover:text-teal-700 dark:hover:text-teal-400 transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-2 group-hover:bg-teal-100 dark:group-hover:bg-teal-900/30 transition-colors">
                 <Upload className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">Upload Logo</span>
            <span className="text-xs text-slate-600 dark:text-slate-400 mt-1">PNG, JPG (Square recommended)</span>
          </div>
        ) : (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-5">
                <div className="flex items-center gap-4">
                    <img src={config.logoUrl} alt="Logo" className="w-12 h-12 object-contain bg-white rounded-md border border-slate-200 shadow-sm" />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Custom Logo</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Embedded in center</p>
                    </div>
                </div>

                {/* Logo Border Styles */}
                <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Border Style</label>
                    <div className="flex bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-1">
                        {[
                            { id: 'square', icon: Square, label: 'Square' },
                            { id: 'circle', icon: Circle, label: 'Circle' },
                            { id: 'none', icon: Minus, label: 'None' },
                        ].map((style) => (
                             <button
                                key={style.id}
                                onClick={() => onChange({ logoPaddingStyle: style.id as LogoPaddingStyle })}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                                    config.logoPaddingStyle === style.id
                                    ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                                }`}
                                title={style.label}
                            >
                                <style.icon className="w-3.5 h-3.5" />
                                {style.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Conditional Controls for Border */}
                {config.logoPaddingStyle !== 'none' && (
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label htmlFor="logo-padding" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Padding</label>
                           <input 
                              id="logo-padding"
                              type="range" 
                              min="0" 
                              max="4" 
                              step="0.5"
                              value={config.logoPadding}
                              onChange={(e) => onChange({ logoPadding: parseFloat(e.target.value) })}
                              className="w-full accent-teal-700 dark:accent-teal-500"
                           />
                      </div>
                      <div>
                        <label htmlFor="logo-bg-color" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Background Color</label>
                        <div className="flex items-center gap-2">
                            <input
                            id="logo-bg-color"
                            type="color"
                            value={config.logoBackgroundColor || config.bgColor}
                            onChange={(e) => onChange({ logoBackgroundColor: e.target.value })}
                            className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                            />
                            <span className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                                {config.logoBackgroundColor || 'Auto'}
                            </span>
                        </div>
                      </div>
                  </div>
                )}

                <div>
                     <label htmlFor="logo-size" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Logo Size</label>
                     <input 
                        id="logo-size"
                        type="range" 
                        min="0.1" 
                        max="0.35" 
                        step="0.01"
                        value={config.logoSize}
                        onChange={(e) => onChange({ logoSize: parseFloat(e.target.value) })}
                        className="w-full accent-teal-700 dark:accent-teal-500"
                     />
                </div>
            </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleLogoUpload}
        />
      </div>

      {/* Advanced Mode */}
      <div className="border-t border-slate-200 dark:border-slate-700 pt-5">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center justify-between w-full text-left"
        >
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Advanced Mode</span>
          {showAdvanced ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4">
             <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Error Correction Level</label>
                <div className="grid grid-cols-2 gap-2">
                   {[
                       { id: 'L', label: 'Low (~7%)', desc: 'Best for screens' },
                       { id: 'M', label: 'Medium (~15%)', desc: 'Standard' },
                       { id: 'Q', label: 'Quartile (~25%)', desc: 'Good for print' },
                       { id: 'H', label: 'High (~30%)', desc: 'Best for logos' },
                   ].map((level) => (
                       <button
                           key={level.id}
                           onClick={() => onChange({ errorCorrectionLevel: level.id as any })}
                           className={`p-2 rounded-lg text-left border transition-all ${
                               config.errorCorrectionLevel === level.id
                               ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-900 dark:text-teal-200'
                               : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                           }`}
                       >
                           <div className="flex items-center gap-2">
                               <div className={`w-3 h-3 rounded-full border ${
                                   config.errorCorrectionLevel === level.id
                                   ? 'border-teal-600 bg-teal-600'
                                   : 'border-slate-400'
                               }`}></div>
                               <span className="text-xs font-medium">{level.label}</span>
                           </div>
                           <span className="text-[10px] text-slate-500 dark:text-slate-400 pl-5 block mt-0.5">{level.desc}</span>
                       </button>
                   ))}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">
                    Higher levels allow the QR code to be scanned even if damaged or covered (e.g., by a logo), but result in a denser code.
                </p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StyleControls;
