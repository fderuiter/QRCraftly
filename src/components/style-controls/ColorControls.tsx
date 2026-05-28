import React from 'react';
import { QRConfig } from '../../types';
import { PRESET_COLORS } from '../../constants';
import { ColorInput } from '../ui/ColorInput';

interface ColorControlsProps {
  config: QRConfig;
  onChange: (updates: Partial<QRConfig>) => void;
}

export const ColorControls: React.FC<ColorControlsProps> = ({ config, onChange }) => {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-3">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Colors</h3>
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
    </div>
  );
};
