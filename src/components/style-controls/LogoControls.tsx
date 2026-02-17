import React, { useRef } from 'react';
import { QRConfig, LogoPaddingStyle } from '../../types';
import { Upload, X, Square, Circle, Minus } from 'lucide-react';
import { ColorInput } from '../ui/ColorInput';
import { RangeInput } from '../ui/RangeInput';

interface LogoControlsProps {
  config: QRConfig;
  onChange: (updates: Partial<QRConfig>) => void;
}

export const LogoControls: React.FC<LogoControlsProps> = ({ config, onChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
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
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-teal-50 dark:hover:bg-teal-900/10 hover:border-teal-400 dark:hover:border-teal-600 hover:text-teal-700 dark:hover:text-teal-400 transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-2 group-hover:bg-teal-100 dark:group-hover:bg-teal-900/30 transition-colors">
            <Upload className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium">Upload Logo</span>
          <span className="text-xs text-slate-600 dark:text-slate-400 mt-1">PNG, JPG (Square recommended)</span>
        </button>
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
                <RangeInput
                  id="logo-padding"
                  label="Padding"
                  min={0}
                  max={4}
                  step={0.5}
                  value={config.logoPadding}
                  onChange={(val) => onChange({ logoPadding: val })}
                />
              </div>
              <ColorInput
                id="logo-bg-color"
                label="Background Color"
                value={config.logoBackgroundColor || config.bgColor}
                onChange={(val) => onChange({ logoBackgroundColor: val })}
                displayValue={config.logoBackgroundColor || 'Auto'}
                sizeClass="w-8 h-8"
              />
            </div>
          )}

          <div>
            <RangeInput
              id="logo-size"
              label="Logo Size"
              min={0.1}
              max={0.35}
              step={0.01}
              value={config.logoSize}
              onChange={(val) => onChange({ logoSize: val })}
              formatValue={(val) => `${(val * 100).toFixed(0)}%`}
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
  );
};
