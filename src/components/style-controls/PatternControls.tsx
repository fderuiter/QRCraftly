import React from 'react';
import { QRConfig } from '../../types';
import { PATTERNS } from '../../constants';
import { PatternModule } from '../ui/PatternModule';

interface PatternControlsProps {
  config: QRConfig;
  onChange: (updates: Partial<QRConfig>) => void;
}

export const PatternControls: React.FC<PatternControlsProps> = ({ config, onChange }) => {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Pattern Style</h3>
      <div
        className="grid grid-cols-4 gap-3"
        role="group"
        aria-label="Pattern Style"
      >
        {PATTERNS.map((pattern) => (
          <button
            key={pattern.id}
            onClick={() => onChange({ style: pattern.id })}
            aria-pressed={config.style === pattern.id}
            aria-label={`Select ${pattern.label} pattern`}
            title={pattern.description}
            className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
              config.style === pattern.id
                ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-500 dark:text-slate-400'
            }`}
          >
            <div className="w-8 h-8 mb-2 grid grid-cols-2 gap-0.5 p-1">
              {[1, 2, 3, 4].map((i) => (
                <PatternModule key={i} style={pattern.id} />
              ))}
            </div>
            <span className="text-xs font-medium text-center leading-tight">{pattern.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
