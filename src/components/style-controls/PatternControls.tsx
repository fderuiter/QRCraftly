import React from 'react';
import { QRConfig, QRStyle } from '../../types';
import { PATTERNS, LOW_RELIABILITY_PATTERNS } from '../../constants';
import { PatternModule } from '../ui/PatternModule';
import { Alert } from '../ui/Alert';
import { ToggleSwitch } from '../ui/ToggleSwitch';

/**
 *
 */
interface PatternControlsProps {
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
export const PatternControls: React.FC<PatternControlsProps> = ({ config, onChange }) => {
  const isLowReliability = LOW_RELIABILITY_PATTERNS.includes(config.style as any);

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Pattern Style</h3>
      
      <div className="mb-4" data-testid="pattern-warning-slot">
        <div className={isLowReliability ? 'visible' : 'invisible'} aria-hidden={!isLowReliability}>
          <Alert variant="error" title="Scannability Warning" role={isLowReliability ? "alert" : undefined}>
            The selected pattern ("{isLowReliability ? (PATTERNS.find(p => p.id === config.style)?.label || '') : 'pattern'}") is complex and may reduce scannability on older mobile devices or in poor lighting. Consider testing thoroughly before printing.
          </Alert>
        </div>
      </div>

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {isLowReliability ? `Scannability Warning: The selected pattern ("${PATTERNS.find(p => p.id === config.style)?.label || ''}") is complex and may reduce scannability on older mobile devices or in poor lighting. Consider testing thoroughly before printing.` : ''}
      </div>

      <div
        className="grid grid-cols-4 gap-3"
        role="radiogroup"
        aria-label="Pattern Style"
      >
        {PATTERNS.map((pattern) => (
          <label
            key={pattern.id}
            className={`inline-flex h-auto cursor-pointer flex-col items-center justify-center rounded-xl border-2 p-3 font-medium transition-colors focus-within:ring-2 focus-within:ring-teal-500 ${
              config.style === pattern.id
                ? 'border-teal-500 bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-slate-800 dark:text-teal-400 dark:hover:bg-slate-700'
                : 'border-transparent bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/50'
            }`}
          >
            <input
              type="radio"
              name="pattern-style"
              value={pattern.id}
              checked={config.style === pattern.id}
              onChange={() => onChange({ style: pattern.id })}
              className="sr-only"
              aria-label={`Select ${pattern.label} pattern`}
            />
            <div className="mb-2 grid size-8 grid-cols-2 gap-0.5 p-1" aria-hidden="true">
              {[1, 2, 3, 4].map((i) => (
                <PatternModule key={i} style={pattern.id} />
              ))}
            </div>
            <span className="text-center text-xs leading-tight font-medium">{pattern.label}</span>
          </label>
        ))}
      </div>

      {(config.style === QRStyle.STARBURST || config.style === QRStyle.SWISS) && (
        <div className="animate-in fade-in slide-in-from-top-2 mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 duration-200 dark:border-slate-700 dark:bg-slate-800/50">
          <div className="mr-3">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Adaptive Geometric Compensation
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Closes visual gaps and corner negative spaces for a more playable layout.
            </p>
          </div>
          <ToggleSwitch
            id="adaptive-compensation-toggle"
            label="Enable Adaptive Geometric Compensation"
            srLabel={true}
            checked={!!config.isCompensationEnabled}
            onChange={(checked) => onChange({ isCompensationEnabled: checked })}
          />
        </div>
      )}
    </div>
  );
};
