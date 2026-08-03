import React from 'react';
import { ShieldCheck, Loader2, ShieldX } from 'lucide-react';
import { ScannabilityStatus, HealthScore } from '../hooks/useScannability';

/**
 *
 */
interface Props {
  /**
   *
   */
  status: ScannabilityStatus;
  /**
   *
   */
  health?: HealthScore;
}

/**
 *
 * @param root0
 * @param root0.status
 * @param root0.health
 */
export const ScannabilityIndicator: React.FC<Props> = ({ status, health }) => {
  if (status === 'idle') {
    return <div className="inline-block h-13 w-auto" data-testid="scannability-indicator-placeholder" />;
  }

  const showHealth = health && health.score < 100;

  return (
    <div className="flex h-13 flex-col items-end justify-start select-none" data-testid="scannability-feedback-wrapper">
      <div className="flex items-center gap-1.5 rounded-full border bg-white px-2 py-1 text-xs font-medium shadow-sm transition-all duration-300 dark:bg-slate-800">
        {status === 'checking' && (
          <>
            <Loader2 className="size-3.5 animate-spin text-slate-500" />
            <span className="text-slate-600 dark:text-slate-300">Checking...</span>
          </>
        )}
        {status === 'physical-pass' && (
          <>
            <ShieldCheck className="size-3.5 text-emerald-500" />
            <span className="text-emerald-700 dark:text-emerald-400">Physical-Ready</span>
          </>
        )}
        {status === 'digital-pass' && (
          <>
            <ShieldCheck className="size-3.5 text-amber-500" />
            <span className="text-amber-700 dark:text-amber-400">Digital-Only Pass</span>
          </>
        )}
        {status === 'fail' && (
          <>
            <ShieldX className="size-3.5 text-rose-500" />
            <span className="text-rose-700 dark:text-rose-400">Low Scannability</span>
          </>
        )}
        {health && (
          <span className={`ml-1 rounded-full px-1.5 text-[10px] ${health.score > 80 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300' : health.score > 50 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300'}`}>
            Health: {health.score}
          </span>
        )}
      </div>
      <div className="mt-1 flex h-5 w-full items-center justify-end">
        {showHealth && health.warnings.length > 0 && (
          <div role="alert" className="animate-in fade-in slide-in-from-top-1 max-w-xs text-right text-xs text-rose-700 dark:text-rose-400">
            {health.warnings[0]}
          </div>
        )}
      </div>
    </div>
  );
};
