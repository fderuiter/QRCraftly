import React from 'react';
import { Button } from '../ui/Button';
import { AlertTriangle } from 'lucide-react';
import { QRConfig } from '../../types';
import { PATTERNS } from '../../constants';
import { PatternModule } from '../ui/PatternModule';

interface PatternControlsProps {
  config: QRConfig;
  onChange: (updates: Partial<QRConfig>) => void;
}

export const PatternControls: React.FC<PatternControlsProps> = ({ config, onChange }) => {
  const isLowReliability = ['grunge', 'circuit', 'starburst'].includes(config.style);

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Pattern Style</h3>
      
      {isLowReliability && (
        <div role="alert" className="mb-4 flex items-start gap-3 p-3 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-lg text-sm text-rose-800 dark:text-rose-300">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>
            <strong>Scannability Warning:</strong> The selected pattern ("{PATTERNS.find(p => p.id === config.style)?.label}") is complex and may reduce scannability on older mobile devices or in poor lighting. Consider testing thoroughly before printing.
          </p>
        </div>
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
