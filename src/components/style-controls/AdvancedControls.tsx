import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { QRConfig, QRErrorCorrectionLevel } from '../../types';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface AdvancedControlsProps {
  config: QRConfig;
  onChange: (updates: Partial<QRConfig>) => void;
}

export const AdvancedControls: React.FC<AdvancedControlsProps> = ({ config, onChange }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="border-t border-slate-200 dark:border-slate-700 pt-5">
      <Button
        variant="ghost"
        size="none"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center justify-between w-full text-left rounded-md"
        aria-expanded={showAdvanced}
        aria-controls="advanced-settings-panel"
      >
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Advanced Mode</span>
        {showAdvanced ? (
          <ChevronUp className="w-4 h-4 text-slate-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-500" />
        )}
      </Button>

      {showAdvanced && (
        <div className="mt-4 space-y-4" id="advanced-settings-panel">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Error Correction Level</label>
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
                    className={`inline-flex flex-col items-start p-2 rounded-lg border text-left cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-teal-500 ${
                      config.errorCorrectionLevel === level.id
                        ? 'bg-teal-50 dark:bg-slate-800 border-teal-500 text-teal-700 dark:text-teal-400'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
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
                      <div className={`w-3 h-3 rounded-full border ${
                        config.errorCorrectionLevel === level.id
                          ? 'border-teal-600 bg-teal-600'
                          : 'border-slate-400'
                      }`} aria-hidden="true"></div>
                      <span className="text-xs font-medium">{level.label}</span>
                    </div>
                    <span id={descId} className="text-[10px] text-slate-500 dark:text-slate-400 pl-5 block mt-0.5">{level.desc}</span>
                  </label>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">
              Higher levels allow the QR code to be scanned even if damaged or covered (e.g., by a logo), but result in a denser code.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
