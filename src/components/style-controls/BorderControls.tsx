import React, { useRef, useMemo, useState } from 'react';
import { QRConfig, BorderStyle, BorderTextPosition, BorderLogoPosition } from '../../types';
import { Upload, X, AlertTriangle } from 'lucide-react';
import { getContrastRatio } from '../../utils/colorUtils';
import { ColorInput } from '../ui/ColorInput';
import { RangeInput } from '../ui/RangeInput';
import { validateImageUpload } from '../../utils/security';

interface BorderControlsProps {
  config: QRConfig;
  onChange: (updates: Partial<QRConfig>) => void;
}

export const BorderControls: React.FC<BorderControlsProps> = ({ config, onChange }) => {
  const borderLogoInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBorderLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError(null);
    if (file) {
      const validationError = validateImageUpload(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        onChange({ borderLogoUrl: event.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const borderTextContrast = useMemo(() => {
    return config.isBorderEnabled && config.borderText
      ? getContrastRatio(config.borderTextColor, config.borderColor)
      : 21;
  }, [config.isBorderEnabled, config.borderText, config.borderTextColor, config.borderColor]);

  const isLowBorderContrast = borderTextContrast < 4.5;

  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Border</h3>
        <div className="flex items-center">
          <label className="relative inline-flex items-center cursor-pointer">
            <span className="sr-only">Enable Border</span>
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
                onChange={(e) => onChange({ borderStyle: e.target.value as BorderStyle })}
                className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-teal-500"
              >
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
                <option value="double">Double</option>
              </select>
            </div>
            <div>
              <RangeInput
                id="border-size"
                label="Width"
                min={0.01}
                max={0.15}
                step={0.005}
                value={config.borderSize}
                onChange={(val) => onChange({ borderSize: val })}
                formatValue={(val) => `${(val * 100).toFixed(1)}%`}
              />
            </div>
          </div>

          <ColorInput
            id="border-color"
            label="Border Color"
            value={config.borderColor}
            onChange={(val) => onChange({ borderColor: val })}
          />

          {/* Border Content Section */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-baseline mb-2">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Content</p>
              {isLowBorderContrast && (
                <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                  <AlertTriangle className="w-3 h-3" />
                  Low Contrast ({borderTextContrast.toFixed(1)})
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
                aria-label="Border text"
              />
              <div className="flex gap-2">
                <select
                  value={config.borderTextPosition || 'bottom-center'}
                  onChange={(e) => onChange({ borderTextPosition: e.target.value as BorderTextPosition })}
                  className="flex-1 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                  aria-label="Border text position"
                >
                  <option value="top-center">Top Center</option>
                  <option value="bottom-center">Bottom Center</option>
                </select>
                <div className="flex items-center gap-1">
                  <input
                    type="color"
                    value={config.borderTextColor || '#ffffff'}
                    onChange={(e) => onChange({ borderTextColor: e.target.value })}
                    className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent focus-visible:ring-2 focus-visible:ring-teal-500 focus:outline-none focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-800"
                    title="Text Color"
                    aria-label="Border text color"
                  />
                </div>
              </div>
            </div>

            {/* Border Logo */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {config.borderLogoUrl ? (
                  <img src={config.borderLogoUrl} alt="Border Logo" width={32} height={32} className="w-8 h-8 object-contain bg-white rounded border border-slate-200" />
                ) : (
                  <span className="text-xs text-slate-500 dark:text-slate-400 italic">No secondary logo</span>
                )}
                {config.borderLogoUrl && (
                  <button
                    onClick={() => onChange({ borderLogoUrl: null })}
                    className="text-xs text-rose-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 rounded focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-800"
                    aria-label="Remove border logo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <button
                onClick={() => borderLogoInputRef.current?.click()}
                className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-medium flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-800"
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
            {error && <div className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</div>}
            {config.borderLogoUrl && (
              <div className="mt-2">
                <select
                  value={config.borderLogoPosition || 'bottom-center'}
                  onChange={(e) => onChange({ borderLogoPosition: e.target.value as BorderLogoPosition })}
                  className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                  aria-label="Border logo position"
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
  );
};
