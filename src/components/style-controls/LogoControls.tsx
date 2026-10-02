import React, { useRef, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { QRConfig, LogoPaddingStyle } from '../../types';
import { Upload, X, Square, Circle, Minus } from 'lucide-react';
import { ColorInput } from '../ui/ColorInput';
import { RangeInput } from '../ui/RangeInput';
import { useImageUpload } from '../../hooks/useImageUpload';
import { SYSTEM_LIMITS } from '../../constants';
import { combineIds } from '../../utils/a11y';

interface LogoControlsProps {
  config: QRConfig;
  onChange: (updates: Partial<QRConfig>) => void;
}

export const LogoControls: React.FC<LogoControlsProps> = ({ config, onChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadButtonRef = useRef<HTMLButtonElement>(null);
  const prevLogoUrlRef = useRef<string | null>(config.logoUrl);
  const { error, handleUpload, setError } = useImageUpload();

  useEffect(() => {
    if (prevLogoUrlRef.current && !config.logoUrl) {
      setTimeout(() => {
        uploadButtonRef.current?.focus();
      }, 50);
    }
    prevLogoUrlRef.current = config.logoUrl;
  }, [config.logoUrl]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleUpload(e, (dataUrl) => onChange({ logoUrl: dataUrl }));
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-fg-soft">Logo</h4>
        {config.logoUrl && (
          <Button variant="error" size="sm" onClick={() => { onChange({ logoUrl: null }); setError(null); }} className="rounded px-2 py-1">
            <X className="mr-1 size-3"/> Remove
          </Button>
        )}
      </div>

      {!config.logoUrl ? (
        <Button
          ref={uploadButtonRef}
          variant="outline"
          size="none"
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="group flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 hover:border-teal-400 hover:bg-teal-50 focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none dark:hover:border-teal-600 dark:hover:bg-teal-900/10"
          aria-describedby={combineIds('logo-upload-help', error && 'logo-upload-error')}
        >
          <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-surface-hover transition-colors group-hover:bg-accent-soft">
            <Upload className="size-5" />
          </div>
          <span className="text-sm font-medium">Upload Logo</span>
          <span id="logo-upload-help" className="mt-1 text-xs text-fg-muted">{SYSTEM_LIMITS.SUPPORTED_IMAGE_FORMATS.map(t => t.replace('image/', '').replace('+xml', '').toUpperCase()).join(', ')} (Square recommended)</span>
          {error && <span id="logo-upload-error" role="alert" className="mt-2 text-xs text-danger">{error}</span>}
        </Button>
      ) : (
        <Card variant="control" className="space-y-5">
          <div className="flex items-center gap-4">
            <img src={config.logoUrl} alt="Custom Brand Graphic" width={48} height={48} className="size-12 rounded-md border border-slate-200 bg-white object-contain shadow-sm" />
            <div className="flex-1">
              <p className="text-sm font-medium text-fg-soft">Custom Logo</p>
              <p className="text-xs text-fg-muted">Embedded in center</p>
            </div>
          </div>

          {/* Logo Border Styles */}
          <div>
            <span id="logo-border-style-label" className="mb-2 block text-xs font-medium text-fg-muted">Border Style</span>
            <div
              className="flex rounded-lg border border-line bg-surface-raised p-1"
              role="radiogroup"
              aria-labelledby="logo-border-style-label"
            >
              {[
                { id: 'square', icon: Square, label: 'Square' },
                { id: 'circle', icon: Circle, label: 'Circle' },
                { id: 'none', icon: Minus, label: 'None' },
              ].map((style) => (
                <label
                  key={style.id}
                  className={`inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors focus-within:ring-2 focus-within:ring-focus ${
                    config.logoPaddingStyle === style.id
                      ? 'bg-teal-50 text-accent dark:bg-slate-800'
                      : 'bg-transparent text-fg-muted hover:bg-surface-hover'
                  }`}
                  title={style.label}
                >
                  <input
                    type="radio"
                    name="logo-border-style"
                    value={style.id}
                    checked={config.logoPaddingStyle === style.id}
                    onChange={() => onChange({ logoPaddingStyle: style.id as LogoPaddingStyle })}
                    onClick={() => onChange({ logoPaddingStyle: style.id as LogoPaddingStyle })}
                    className="sr-only"
                    aria-label={`Set logo border style to ${style.label}`}
                  />
                  <style.icon className="size-3.5" aria-hidden="true" />
                  {style.label}
                </label>
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
        </Card>
      )}
      <input
        ref={fileInputRef}
        type="file"
        aria-label="Upload logo image"
        accept={SYSTEM_LIMITS.SUPPORTED_IMAGE_FORMATS.join(',')}
        className="hidden"
        onChange={handleLogoUpload}
      />
    </div>
  );
};
