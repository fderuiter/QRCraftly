import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { QRConfig, QRErrorCorrectionLevel } from '../../types';
import { ChevronDown } from 'lucide-react';

interface AdvancedControlsProps {
  config: QRConfig;
  onChange: (updates: Partial<QRConfig>) => void;
}

export const AdvancedControls: React.FC<AdvancedControlsProps> = ({ config, onChange }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface-raised transition-colors duration-300">
      <h3 className="m-0 text-base">
        <Button
          variant="ghost"
          size="none"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex min-h-11 w-full justify-between! rounded-none px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/40"
          aria-expanded={showAdvanced}
          aria-controls="advanced-settings-panel"
        >
          <span className="font-semibold text-fg">Advanced Mode</span>
          <ChevronDown
            aria-hidden="true"
            className={`size-5 text-fg-muted motion-safe:transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
          />
        </Button>
      </h3>

      {showAdvanced && (
        <div className="space-y-4 px-5 pb-4" id="advanced-settings-panel">
          <div>
            <span className="mb-2 block text-xs font-medium text-fg-muted">Error Correction Level</span>
            <div
              className="grid grid-cols-2 gap-2"
              role="radiogroup"
              aria-label="Error Correction Level"
            >
              {[
                { id: QRErrorCorrectionLevel.L, label: 'Low (~7%)', desc: 'Best for screens' },
                { id: QRErrorCorrectionLevel.M, label: 'Medium (~15%)', desc: 'Standard' },
                { id: QRErrorCorrectionLevel.Q, label: 'Quartile (~25%)', desc: 'Good for print' },
                { id: QRErrorCorrectionLevel.H, label: 'High (~30%)', desc: 'Best for logos' },
              ].map((level) => {
                const descId = `ecc-desc-${level.id}`;
                return (
                  <label
                    key={level.id}
                    className={`inline-flex cursor-pointer flex-col items-start rounded-lg border p-2 text-left transition-colors focus-within:ring-2 focus-within:ring-focus ${
                      config.errorCorrectionLevel === level.id
                        ? 'border-teal-500 bg-teal-50 text-accent dark:bg-slate-800'
                        : 'border-line bg-surface-raised text-fg-soft hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="error-correction-level"
                      value={level.id}
                      checked={config.errorCorrectionLevel === level.id}
                      onChange={() => onChange({ errorCorrectionLevel: level.id })}
                      onClick={() => onChange({ errorCorrectionLevel: level.id })}
                      className="sr-only"
                      aria-label={`Set error correction level to ${level.label}`}
                      aria-describedby={descId}
                    />
                    <div className="flex items-center gap-2">
                      <div className={`size-3 rounded-full border ${
                        config.errorCorrectionLevel === level.id
                          ? 'border-teal-600 bg-teal-600'
                          : 'border-slate-400'
                      }`} aria-hidden="true"></div>
                      <span className="text-xs font-medium">{level.label}</span>
                    </div>
                    <span id={descId} className="mt-0.5 block pl-5 text-xs text-fg-muted">{level.desc}</span>
                  </label>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-fg-muted">
              Higher levels allow the QR code to be scanned even if damaged or covered (e.g., by a logo), but result in a denser code.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
