import React, { useMemo } from 'react';
import { QRConfig } from '../../types';
import { PRESET_COLORS, MIN_CONTRAST_THRESHOLD } from '../../constants';
import { getContrastRatio } from '../../utils/colorUtils';
import { Check } from 'lucide-react';
import { ColorInput } from '../ui/ColorInput';
import { ContrastBadge, ContrastBanner } from './ContrastWarning';

interface ColorControlsProps {
  config: QRConfig;
  onChange: (updates: Partial<QRConfig>) => void;
}

export const ColorControls: React.FC<ColorControlsProps> = ({ config, onChange }) => {
  const contrastRatios = useMemo(() => {
    const fgContrast = getContrastRatio(config.fgColor, config.bgColor);
    const eyeContrast = getContrastRatio(config.eyeColor, config.bgColor);
    return { fg: fgContrast, eye: eyeContrast };
  }, [config.fgColor, config.bgColor, config.eyeColor]);

  const isLowContrast = contrastRatios.fg < MIN_CONTRAST_THRESHOLD || contrastRatios.eye < MIN_CONTRAST_THRESHOLD;
  const worstContrast = Math.min(contrastRatios.fg, contrastRatios.eye);

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <h4 className="text-sm font-semibold text-fg-soft">Colors</h4>
        <ContrastBadge isVisible={isLowContrast} contrastRatio={worstContrast} decimalPrecision={1} />
      </div>


      <div
        className="mb-5 grid grid-cols-3 gap-2"
        role="radiogroup"
        aria-label="Color Presets"
      >
        {PRESET_COLORS.map((preset) => {
          const isSelected = config.fgColor === preset.fg && config.bgColor === preset.bg && config.eyeColor === preset.eye;
          const applyPreset = () => onChange({ fgColor: preset.fg, bgColor: preset.bg, eyeColor: preset.eye });
          return (
            <label
              key={preset.label}
              className={`relative flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border-2 p-1.5 text-xs transition-colors focus-within:ring-2 focus-within:ring-focus focus-within:ring-offset-1 dark:focus-within:ring-offset-slate-900 ${
                isSelected
                  ? 'border-teal-700 bg-accent-soft font-semibold text-teal-900 dark:border-teal-300 dark:text-teal-100'
                  : 'border-line bg-surface-raised font-medium text-fg-soft hover:border-slate-400 dark:hover:border-slate-500'
              }`}
            >
              <input
                type="radio"
                name="color-preset"
                value={preset.label}
                checked={isSelected}
                onChange={applyPreset}
                onClick={applyPreset}
                className="sr-only"
                aria-label={`Select ${preset.label} theme`}
              />
              {/* Use SVG presentation attributes instead of inline styles for CSP compliance */}
              <svg viewBox="0 0 40 40" className="size-7 shrink-0 rounded ring-1 ring-slate-300 dark:ring-slate-600" aria-hidden="true">
                {/* Background */}
                <rect width="40" height="40" fill={preset.bg} />
                {/* Foreground Ring (Simulating Modules) */}
                <rect x="6" y="6" width="28" height="28" rx="2" fill="none" stroke={preset.fg} strokeWidth="6" />
                {/* Eye Center */}
                <rect x="11" y="11" width="18" height="18" rx="1" fill={preset.eye} />
              </svg>
              <span className="min-w-0 leading-tight">{preset.label}</span>
              {isSelected && (
                <Check className="absolute top-0.5 right-0.5 size-3.5 text-teal-700 dark:text-teal-300" aria-hidden="true" />
              )}
            </label>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <ColorInput
          id="fg-color"
          label="Foreground"
          value={config.fgColor}
          onChange={(val) => onChange({ fgColor: val })}
        />
        <ColorInput
          id="bg-color"
          label="Background"
          value={config.bgColor}
          onChange={(val) => onChange({ bgColor: val })}
        />
        <div className="col-span-2">
          <ColorInput
            id="eye-color"
            label="Eye Color (Corners)"
            value={config.eyeColor}
            onChange={(val) => onChange({ eyeColor: val })}
          />
        </div>
      </div>
      <ContrastBanner
        isVisible={isLowContrast}
        contrastRatio={worstContrast}
        messageType="color"
        className="mt-3"
        role="status"
        decimalPrecision={2}
      />
    </div>
  );
};
