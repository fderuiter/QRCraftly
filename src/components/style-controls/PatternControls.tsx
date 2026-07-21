import React from 'react';

import { Button } from '../ui/Button';
import { QRConfig } from '../../types';
import { PATTERNS, LOW_RELIABILITY_PATTERNS } from '../../constants';
import { PatternModule } from '../ui/PatternModule';
import { Alert } from '../ui/Alert';

interface PatternControlsProps {
  config: QRConfig;
  onChange: (updates: Partial<QRConfig>) => void;
}

export const PatternControls: React.FC<PatternControlsProps> = ({ config, onChange }) => {
  const isLowReliability = LOW_RELIABILITY_PATTERNS.includes(config.style as any);

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Pattern Style</h3>
      
      {isLowReliability && (
        <Alert variant="error" title="Scannability Warning" className="mb-4">
          The selected pattern ("{PATTERNS.find(p => p.id === config.style)?.label}") is complex and may reduce scannability on older mobile devices or in poor lighting. Consider testing thoroughly before printing.
        </Alert>
      )}

      <div
        className="grid grid-cols-4 gap-3"
        role="group"
        aria-label="Pattern Style"
      >
        {PATTERNS.map((pattern) => (
          <Button
            key={pattern.id}
            variant={config.style === pattern.id ? 'secondary' : 'outline'}
            size="none"
            onClick={() => onChange({ style: pattern.id })}
            aria-pressed={config.style === pattern.id}
            aria-label={`Select ${pattern.label} pattern`}
            className={`flex-col p-3 rounded-xl border-2 h-auto ${config.style === pattern.id ? 'border-teal-500' : 'border-transparent'}`}
          >
            <div className="w-8 h-8 mb-2 grid grid-cols-2 gap-0.5 p-1">
              {[1, 2, 3, 4].map((i) => (
                <PatternModule key={i} style={pattern.id} />
              ))}
            </div>
            <span className="text-xs font-medium text-center leading-tight">{pattern.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};
