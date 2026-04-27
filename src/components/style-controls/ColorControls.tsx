import React, { useMemo } from 'react';
import { QRConfig } from '../../types';
import { PRESET_COLORS } from '../../constants';
import { AlertTriangle } from 'lucide-react';
import { getContrastRatio } from '../../utils/colorUtils';
import { ColorInput } from '../ui/ColorInput';

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

  const isLowContrast = contrastRatios.fg < 4.5 || contrastRatios.eye < 4.5;
  const worstContrast = Math.min(contrastRatios.fg, contrastRatios.eye);

  return (
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

      <div
        className="flex flex-wrap gap-3 mb-5"
        role="group"
        aria-label="Color Presets"
      >
        {PRESET_COLORS.map((preset, idx) => (
          <button
            key={idx}
            onClick={() => onChange({ fgColor: preset.fg, bgColor: preset.bg, eyeColor: preset.eye })}
            aria-pressed={config.fgColor === preset.fg && config.bgColor === preset.bg && config.eyeColor === preset.eye}
            aria-label={`Select ${preset.label} theme`}
            className="group relative w-10 h-10 rounded-lg shadow-sm hover:scale-110 transition-transform duration-200 ring-1 ring-slate-200 dark:ring-slate-700 overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
            title={preset.label}
          >
            {/* Use SVG presentation attributes instead of inline styles for CSP compliance */}
            <svg viewBox="0 0 40 40" className="absolute inset-0 w-full h-full">
              {/* Background */}
              <rect width="40" height="40" fill={preset.bg} />
              {/* Foreground Ring (Simulating Modules) */}
              <rect x="6" y="6" width="28" height="28" rx="2" fill="none" stroke={preset.fg} strokeWidth="6" />
              {/* Eye Center */}
              <rect x="11" y="11" width="18" height="18" rx="1" fill={preset.eye} />
            </svg>
          </button>
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
      {isLowContrast && (
        <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg text-xs text-amber-800 dark:text-amber-400">
          Warning: The contrast ratio is low ({worstContrast.toFixed(2)}). QR codes should have high contrast (aim for 4.5:1) to be scannable by all devices.
        </div>
      )}
    </div>
  );
};
