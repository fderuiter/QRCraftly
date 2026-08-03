import React, { useMemo } from 'react';
import { QRConfig } from '../../types';
import { PRESET_COLORS } from '../../constants';
import { AlertTriangle } from 'lucide-react';
import { getContrastRatio } from '../../utils/colorUtils';
import { ColorInput } from '../ui/ColorInput';
import { Alert } from '../ui/Alert';

/**
 *
 */
interface ColorControlsProps {
  /**
   *
   */
  config: QRConfig;
  /**
   *
   */
  onChange: (updates: Partial<QRConfig>) => void;
}

/**
 *
 * @param root0
 * @param root0.config
 * @param root0.onChange
 */
export const ColorControls: React.FC<ColorControlsProps> = ({ config, onChange }) => {
  const contrastRatios = useMemo(() => {
    const fgContrast = getContrastRatio(config.fgColor, config.bgColor);
    const eyeContrast = getContrastRatio(config.eyeColor, config.bgColor);
    return { fg: fgContrast, eye: eyeContrast };
  }, [config.fgColor, config.bgColor, config.eyeColor]);

  const isLowContrast = contrastRatios.fg < 4.5 || contrastRatios.eye < 4.5;
  const worstContrast = Math.min(contrastRatios.fg, contrastRatios.eye);

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Colors</h3>
        <div aria-live="polite" aria-atomic="true">
          {isLowContrast && (
            <span className="flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
              <AlertTriangle className="size-3" aria-hidden="true" />
              Low Contrast ({worstContrast.toFixed(1)})
            </span>
          )}
        </div>
      </div>

      <div
        className="mb-5 flex flex-wrap gap-3"
        role="radiogroup"
        aria-label="Color Presets"
      >
        {PRESET_COLORS.map((preset, idx) => (
          <label
            key={idx}
            className={`group relative inline-flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded-lg font-medium shadow-sm ring-1 transition duration-200 focus-within:ring-2 focus-within:ring-teal-500 hover:scale-110 ${
              config.fgColor === preset.fg && config.bgColor === preset.bg && config.eyeColor === preset.eye
                ? 'ring-teal-500'
                : 'ring-slate-200 dark:ring-slate-700'
            }`}
            title={preset.label}
          >
            <input
              type="radio"
              name="color-preset"
              value={preset.label}
              checked={config.fgColor === preset.fg && config.bgColor === preset.bg && config.eyeColor === preset.eye}
              onChange={() => onChange({ fgColor: preset.fg, bgColor: preset.bg, eyeColor: preset.eye })}
              onClick={() => onChange({ fgColor: preset.fg, bgColor: preset.bg, eyeColor: preset.eye })}
              className="sr-only"
              aria-label={`Select ${preset.label} theme`}
            />
            {/* Use SVG presentation attributes instead of inline styles for CSP compliance */}
            <svg viewBox="0 0 40 40" className="absolute inset-0 size-full" aria-hidden="true">
              {/* Background */}
              <rect width="40" height="40" fill={preset.bg} />
              {/* Foreground Ring (Simulating Modules) */}
              <rect x="6" y="6" width="28" height="28" rx="2" fill="none" stroke={preset.fg} strokeWidth="6" />
              {/* Eye Center */}
              <rect x="11" y="11" width="18" height="18" rx="1" fill={preset.eye} />
            </svg>
          </label>
        ))}
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
      <div aria-live="polite" aria-atomic="true">
        {isLowContrast && (
          <Alert variant="warning" className="mt-3" role="status">
            Warning: The contrast ratio is low ({worstContrast.toFixed(2)}). QR codes should have high contrast (aim for 4.5:1) to be scannable by all devices.
          </Alert>
        )}
      </div>
    </div>
  );
};
