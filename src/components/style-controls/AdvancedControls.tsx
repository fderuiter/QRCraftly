import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { QRConfig, QRErrorCorrectionLevel } from '../../types';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ToggleSwitch } from '../ui/ToggleSwitch';
import { ColorInput } from '../ui/ColorInput';

/**
 *
 */
interface AdvancedControlsProps {
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
export const AdvancedControls: React.FC<AdvancedControlsProps> = ({ config, onChange }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="border-t border-slate-200 pt-5 dark:border-slate-700">
      <Button
        variant="ghost"
        size="none"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex w-full items-center justify-between rounded-md text-left"
        aria-expanded={showAdvanced}
        aria-controls="advanced-settings-panel"
      >
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Advanced Mode</span>
        {showAdvanced ? (
          <ChevronUp className="size-4 text-slate-500" />
        ) : (
          <ChevronDown className="size-4 text-slate-500" />
        )}
      </Button>

      {showAdvanced && (
        <div className="mt-4 space-y-4" id="advanced-settings-panel">
          <div>
            <span className="mb-2 block text-xs font-medium text-slate-500 dark:text-slate-400">Error Correction Level</span>
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
                    className={`inline-flex cursor-pointer flex-col items-start rounded-lg border p-2 text-left transition-colors focus-within:ring-2 focus-within:ring-teal-500 ${
                      config.errorCorrectionLevel === level.id
                        ? 'border-teal-500 bg-teal-50 text-teal-700 dark:bg-slate-800 dark:text-teal-400'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/50'
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
                    <span id={descId} className="mt-0.5 block pl-5 text-[10px] text-slate-500 dark:text-slate-400">{level.desc}</span>
                  </label>
                );
              })}
            </div>
            <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">
              Higher levels allow the QR code to be scanned even if damaged or covered (e.g., by a logo), but result in a denser code.
            </p>
          </div>

          {/* Maze Overlay Controls */}
          <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
            <div className="mb-4">
              <ToggleSwitch
                id="is-maze-enabled"
                label="Playable Maze Overlay"
                checked={!!config.isMazeEnabled}
                onChange={(checked) => onChange({ isMazeEnabled: checked })}
              />
              <p className="mt-1 pl-12 text-[10px] text-slate-500 dark:text-slate-400">
                Generates a solvable maze on empty modules and quiet zones without changing data modules.
              </p>
            </div>

            {config.isMazeEnabled && (
              <div className="pl-12 space-y-4">
                <ColorInput
                  id="maze-color"
                  label="Maze Path Color"
                  value={config.mazeColor || '#3b82f6'}
                  onChange={(val) => onChange({ mazeColor: val })}
                />
                
                <ToggleSwitch
                  id="show-maze-solution"
                  label="Show Maze Solution"
                  checked={!!config.showMazeSolution}
                  onChange={(checked) => onChange({ showMazeSolution: checked })}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
