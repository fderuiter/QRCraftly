import React, { useMemo } from 'react';
import { QRConfig, QRStyle } from '../../types';
import { getContrastRatio } from '../../utils/colorUtils';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface ScannabilityMonitorProps {
  config: QRConfig;
}

export const ScannabilityMonitor: React.FC<ScannabilityMonitorProps> = ({ config }) => {
  const { score, warnings } = useMemo(() => {
    let currentScore = 100;
    const currentWarnings: string[] = [];

    const fgContrast = getContrastRatio(config.fgColor, config.bgColor);
    const eyeContrast = getContrastRatio(config.eyeColor, config.bgColor);
    const worstContrast = Math.min(fgContrast, eyeContrast);

    // Base contrast score
    if (worstContrast < 4.5) {
      currentScore -= 30;
      currentWarnings.push(`Low contrast (${worstContrast.toFixed(1)}). Aim for at least 4.5:1.`);
    } else if (worstContrast < 7) {
      currentScore -= 10;
    }

    // Pattern complexity
    if (config.style === QRStyle.GRUNGE) {
      currentScore -= 20;
      currentWarnings.push("Grunge pattern adds noise.");
      if (worstContrast < 7) {
        currentScore -= 15;
        currentWarnings.push("Pattern complexity too high for current contrast.");
      }
    } else if (config.style === QRStyle.CIRCUIT) {
      currentScore -= 15;
      currentWarnings.push("Circuit pattern modifies shapes heavily.");
    } else if (config.style === QRStyle.STARBURST) {
      currentScore -= 15;
      currentWarnings.push("Starburst pattern heavily distorts modules.");
      if (worstContrast < 6) {
        currentScore -= 10;
        currentWarnings.push("High contrast recommended for Starburst pattern.");
      }
    }

    // Logo impact
    if (config.logoUrl) {
      if (config.logoSize > 30) {
        currentScore -= 15;
        currentWarnings.push("Large logo might obscure critical data.");
      } else {
        currentScore -= 5;
      }
    }

    return { score: Math.max(0, currentScore), warnings: currentWarnings };
  }, [config.fgColor, config.bgColor, config.eyeColor, config.style, config.logoUrl, config.logoSize]);

  let statusColor = 'text-emerald-600 dark:text-emerald-400';
  let bgColor = 'bg-emerald-50 dark:bg-emerald-950/30';
  let borderColor = 'border-emerald-200 dark:border-emerald-900';
  let Icon = CheckCircle;
  let statusText = 'Excellent';

  if (score < 60) {
    statusColor = 'text-rose-600 dark:text-rose-400';
    bgColor = 'bg-rose-50 dark:bg-rose-950/30';
    borderColor = 'border-rose-200 dark:border-rose-900';
    Icon = AlertTriangle;
    statusText = 'Poor (Might not scan)';
  } else if (score < 85) {
    statusColor = 'text-amber-600 dark:text-amber-400';
    bgColor = 'bg-amber-50 dark:bg-amber-950/30';
    borderColor = 'border-amber-200 dark:border-amber-900';
    Icon = Info;
    statusText = 'Fair';
  }

  return (
    <div className={`p-4 rounded-xl border ${bgColor} ${borderColor} mb-6 transition-colors duration-300`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className={`text-sm font-bold flex items-center gap-2 ${statusColor}`}>
          <Icon className="w-4 h-4" />
          Scannability Health: {score}%
        </h3>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColor} bg-white/50 dark:bg-black/20`}>
          {statusText}
        </span>
      </div>
      {warnings.length > 0 && (
        <ul className="mt-2 space-y-1" role="alert" aria-live="polite">
          {warnings.map((warning, idx) => (
            <li key={idx} className={`text-xs ${statusColor} flex items-start gap-1.5`}>
              <span className="mt-0.5">•</span>
              {warning}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
