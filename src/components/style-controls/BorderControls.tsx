import React, { useRef, useMemo, useEffect } from 'react';
import { Button } from '../ui/Button';
import { QRConfig, BorderStyle, BorderTextPosition, BorderLogoPosition } from '../../types';
import { Upload, X, AlertTriangle } from 'lucide-react';
import { getContrastRatio } from '../../utils/colorUtils';
import { ColorInput } from '../ui/ColorInput';
import { RangeInput } from '../ui/RangeInput';
import { useImageUpload } from '../../hooks/useImageUpload';
import { ToggleSwitch } from '../ui/ToggleSwitch';
import { SelectField, TextField } from '../ui/FormFields';
import { useOptionalQRStoreSelector } from '../../context/QRContext';

interface BorderControlsProps {
  config: QRConfig;
  onChange: (updates: Partial<QRConfig>) => void;
}

export const BorderControls: React.FC<BorderControlsProps> = ({ config, onChange }) => {
  const moduleCount = useOptionalQRStoreSelector(s => s.moduleCount) ?? 0;

  const borderModules = useMemo(() => {
    if (!moduleCount) return 0;
    const minModules = 4;
    const userModules = (config.borderSize * moduleCount) / (1 - 2 * config.borderSize);
    return Math.max(minModules, Math.round(userModules * 10) / 10);
  }, [moduleCount, config.borderSize]);

  const borderLogoInputRef = useRef<HTMLInputElement>(null);
  const borderLogoUploadButtonRef = useRef<HTMLButtonElement>(null);
  const prevBorderLogoUrlRef = useRef<string | null>(config.borderLogoUrl);
  const { error, handleUpload, setError } = useImageUpload();

  useEffect(() => {
    if (prevBorderLogoUrlRef.current && !config.borderLogoUrl) {
      setTimeout(() => {
        borderLogoUploadButtonRef.current?.focus();
      }, 50);
    }
    prevBorderLogoUrlRef.current = config.borderLogoUrl;
  }, [config.borderLogoUrl]);

  const handleBorderLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleUpload(e, (dataUrl) => onChange({ borderLogoUrl: dataUrl }));
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
        <ToggleSwitch
          id="enable-border"
          label="Enable Border"
          srLabel={true}
          checked={config.isBorderEnabled}
          onChange={(checked) => onChange({ isBorderEnabled: checked })}
        />
      </div>

      {config.isBorderEnabled && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 gap-4">
            <SelectField
              id="border-style"
              label="Style"
              value={config.borderStyle || 'solid'}
              onChange={(e) => onChange({ borderStyle: e.target.value as BorderStyle })}
            >
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
              <option value="double">Double</option>
            </SelectField>
            <div>
              <RangeInput
                id="border-size"
                label={`Width (~${borderModules} mod)`}
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
              <div aria-live="polite" aria-atomic="true">
                {isLowBorderContrast && (
                  <span className="flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                    <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                    Low Contrast ({borderTextContrast.toFixed(1)})
                  </span>
                )}
              </div>
            </div>

            {/* Border Text */}
            <div className="space-y-2 mb-3">
              <TextField
                placeholder="Text on border..."
                value={config.borderText}
                onChange={(e) => onChange({ borderText: e.target.value })}
                aria-label="Border text"
              />
              <div className="flex gap-2 items-start">
                <div className="flex-1">
                  <SelectField
                    label="Position"
                    labelClassName="sr-only"
                    value={config.borderTextPosition || 'bottom-center'}
                    onChange={(e) => onChange({ borderTextPosition: e.target.value as BorderTextPosition })}
                    aria-label="Border text position"
                  >
                    <option value="top-center">Top Center</option>
                    <option value="bottom-center">Bottom Center</option>
                  </SelectField>
                </div>
                <div className="flex items-center mt-1">
                  <ColorInput
                    id="border-text-color"
                    value={config.borderTextColor || '#ffffff'}
                    onChange={(val) => onChange({ borderTextColor: val })}
                    sizeClass="w-9 h-9"
                    title="Text Color"
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
                  <Button
                    variant="error"
                    size="icon"
                    onClick={() => { onChange({ borderLogoUrl: null }); setError(null); }}
                    className="p-1 rounded-full w-auto h-auto min-w-0"
                    aria-label="Remove border logo"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
              <Button
                ref={borderLogoUploadButtonRef}
                variant="ghost"
                size="sm"
                onClick={() => borderLogoInputRef.current?.click()}
                className="text-teal-600 dark:text-teal-400 hover:text-teal-700 hover:bg-teal-50"
              >
                <Upload className="w-3 h-3 mr-1" />
                {config.borderLogoUrl ? 'Change' : 'Add Logo'}
              </Button>
              <input
                ref={borderLogoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleBorderLogoUpload}
              />
            </div>
            {error && <div role="alert" className="mt-1 text-xs text-rose-700 dark:text-rose-400">{error}</div>}
            {config.borderLogoUrl && (
              <div className="mt-2">
                <SelectField
                  label="Logo Position"
                  labelClassName="sr-only"
                  value={config.borderLogoPosition || 'bottom-center'}
                  onChange={(e) => onChange({ borderLogoPosition: e.target.value as BorderLogoPosition })}
                  aria-label="Border logo position"
                >
                  <option value="bottom-center">Bottom Center</option>
                  <option value="bottom-right">Bottom Right</option>
                </SelectField>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
