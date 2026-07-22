import React, { useRef } from 'react';
import { Button } from '../ui/Button';
import { QRConfig, LogoPaddingStyle } from '../../types';
import { Upload, X, Square, Circle, Minus } from 'lucide-react';
import { ColorInput } from '../ui/ColorInput';
import { RangeInput } from '../ui/RangeInput';
import { useImageUpload } from '../../hooks/useImageUpload';
import { SYSTEM_LIMITS } from '../../constants';

interface LogoControlsProps {
  config: QRConfig;
  onChange: (updates: Partial<QRConfig>) => void;
}

export const LogoControls: React.FC<LogoControlsProps> = ({ config, onChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { error, handleUpload, setError } = useImageUpload();

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleUpload(e, (dataUrl) => onChange({ logoUrl: dataUrl }));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Logo</h3>
        {config.logoUrl && (
          <Button variant="error" size="sm" onClick={() => { onChange({ logoUrl: null }); setError(null); }} className="px-2 py-1 rounded">
            <X className="w-3 h-3 mr-1"/> Remove
          </Button>
        )}
      </div>

      {!config.logoUrl ? (
        <Button
          variant="outline"
          size="none"
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer group hover:bg-teal-50 dark:hover:bg-teal-900/10 hover:border-teal-400 dark:hover:border-teal-600"
        >
          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-2 group-hover:bg-teal-100 dark:group-hover:bg-teal-900/30 transition-colors">
            <Upload className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium">Upload Logo</span>
          <span className="text-xs text-slate-600 dark:text-slate-400 mt-1">{SYSTEM_LIMITS.SUPPORTED_IMAGE_FORMATS.map(t => t.replace('image/', '').replace('+xml', '').toUpperCase()).join(', ')} (Square recommended)</span>
          {error && <span role="alert" className="text-xs text-rose-700 dark:text-rose-400 mt-2">{error}</span>}
        </Button>
      ) : (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-5">
          <div className="flex items-center gap-4">
            <img src={config.logoUrl} alt="Logo" width={48} height={48} className="w-12 h-12 object-contain bg-white rounded-md border border-slate-200 shadow-sm" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Custom Logo</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Embedded in center</p>
            </div>
          </div>

          {/* Logo Border Styles */}
          <div>
            <label id="logo-border-style-label" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Border Style</label>
            <div
              className="flex bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-1"
              role="group"
              aria-labelledby="logo-border-style-label"
            >
              {[
                { id: 'square', icon: Square, label: 'Square' },
                { id: 'circle', icon: Circle, label: 'Circle' },
                { id: 'none', icon: Minus, label: 'None' },
              ].map((style) => (
                <Button
                  key={style.id}
                  variant={config.logoPaddingStyle === style.id ? 'secondary' : 'ghost'}
                  size="none"
                  onClick={() => onChange({ logoPaddingStyle: style.id as LogoPaddingStyle })}
                  aria-pressed={config.logoPaddingStyle === style.id}
                  aria-label={`Set logo border style to ${style.label}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs"
                  title={style.label}
                >
                  <style.icon className="w-3.5 h-3.5" />
                  {style.label}
                </Button>
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
              max={SYSTEM_LIMITS.MAX_LOGO_SIZE}
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
        accept={SYSTEM_LIMITS.SUPPORTED_IMAGE_FORMATS.join(',')}
        className="hidden"
        onChange={handleLogoUpload}
      />
    </div>
  );
};
