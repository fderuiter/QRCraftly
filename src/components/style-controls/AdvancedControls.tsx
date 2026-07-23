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
            <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Error Correction Level</span>
            <div
              className="grid grid-cols-2 gap-2"
              role="group"
              aria-label="Error Correction Level"
            >
              {[
                { id: QRErrorCorrectionLevel.L, label: 'Low (~7%)', desc: 'Best for screens' },
                { id: QRErrorCorrectionLevel.M, label: 'Medium (~15%)', desc: 'Standard' },
                { id: QRErrorCorrectionLevel.Q, label: 'Quartile (~25%)', desc: 'Good for print' },
                { id: QRErrorCorrectionLevel.H, label: 'High (~30%)', desc: 'Best for logos' },
              ].map((level) => (
                <Button
                  key={level.id}
                  variant={config.errorCorrectionLevel === level.id ? 'secondary' : 'outline'}
                  size="none"
                  onClick={() => onChange({ errorCorrectionLevel: level.id })}
                  aria-pressed={config.errorCorrectionLevel === level.id}
                  aria-label={`Set error correction level to ${level.label}`}
                  className="flex-col items-start p-2 rounded-lg border text-left"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full border ${
                      config.errorCorrectionLevel === level.id
                        ? 'border-teal-600 bg-teal-600'
                        : 'border-slate-400'
                    }`}></div>
                    <span className="text-xs font-medium">{level.label}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 pl-5 block mt-0.5">{level.desc}</span>
                </Button>
              ))}
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
