
import React, { useRef, useMemo } from 'react';
import { QRConfig, QRStyle, LogoPaddingStyle } from '../types';
import { PATTERNS, PRESET_COLORS } from '../constants';
import { Upload, X, AlertTriangle, Circle, Square, Minus } from 'lucide-react';

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
 */
const StyleControls: React.FC<StyleControlsProps> = ({ config, onChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Handles the file upload for the logo.
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

  const contrastRatios = useMemo(() => {
      const fgContrast = getContrastRatio(config.fgColor, config.bgColor);
      const eyeContrast = getContrastRatio(config.eyeColor, config.bgColor);
      return { fg: fgContrast, eye: eyeContrast };
  }, [config.fgColor, config.bgColor, config.eyeColor]);

  // Increased sensitivity threshold to 4.5 (WCAG AA for text, better for scanning)
  const isLowContrast = contrastRatios.fg < 4.5 || contrastRatios.eye < 4.5;
  const worstContrast = Math.min(contrastRatios.fg, contrastRatios.eye);

  return (
    <div className="space-y-8">
      {/* Pattern Style */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Pattern Style</h3>
        <div className="grid grid-cols-3 gap-3">
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
                      if (pattern.id === QRStyle.STAR) {
                         return (
                             <div key={i} className="flex items-center justify-center">
                                 <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                                     <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                 </svg>
                             </div>
                         );
                      }
                      if (pattern.id === QRStyle.HEART) {
                          return (
                              <div key={i} className="flex items-center justify-center">
                                 <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                                     <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                 </svg>
                              </div>
                          );
                      }
                      if (pattern.id === QRStyle.CROSS) {
                          return (
                              <div key={i} className="flex items-center justify-center bg-current" style={{ clipPath: 'polygon(35% 0%, 65% 0%, 65% 35%, 100% 35%, 100% 65%, 65% 65%, 65% 100%, 35% 100%, 35% 65%, 0% 65%, 0% 35%, 35% 35%)' }} />
                          );
                      }
                      if (pattern.id === QRStyle.DIAMOND) {
                           return (
                              <div key={i} className="flex items-center justify-center">
                                  <div className="bg-current w-full h-full" style={{ transform: 'rotate(45deg) scale(0.7)' }} />
                              </div>
                          );
                      }
                      return (
                        <div key={i} className={`bg-current ${
                            pattern.id === QRStyle.DOTS ? 'rounded-full' :
                            pattern.id === QRStyle.ROUNDED ? 'rounded-sm' : 'rounded-none'
                        }`} />
                    );
                  })}
              </div>
              <span className="text-xs font-medium">{pattern.label}</span>
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
    </div>
  );
};

export default StyleControls;
