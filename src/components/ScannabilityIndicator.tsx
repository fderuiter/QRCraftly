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
    return <div className="h-[52px] w-auto inline-block" data-testid="scannability-indicator-placeholder" />;
  }

  const showHealth = health && health.score < 100;

  return (
    <div className="h-[52px] flex flex-col justify-start items-end select-none" data-testid="scannability-feedback-wrapper">
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-medium bg-white dark:bg-slate-800 shadow-sm transition-all duration-300">
        {status === 'checking' && (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
            <span className="text-slate-600 dark:text-slate-300">Checking...</span>
          </>
        )}
        {status === 'physical-pass' && (
          <>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-emerald-700 dark:text-emerald-400">Physical-Ready</span>
          </>
        )}
        {status === 'digital-pass' && (
          <>
            <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-amber-700 dark:text-amber-400">Digital-Only Pass</span>
          </>
        )}
        {status === 'fail' && (
          <>
            <ShieldX className="w-3.5 h-3.5 text-rose-500" />
            <span className="text-rose-700 dark:text-rose-400">Low Scannability</span>
          </>
        )}
        {health && (
          <span className={`ml-1 px-1.5 rounded-full text-[10px] ${health.score > 80 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300' : health.score > 50 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300'}`}>
            Health: {health.score}
          </span>
        )}
      </div>
      <div className="h-5 mt-1 flex items-center justify-end w-full">
        {showHealth && health.warnings.length > 0 && (
          <div role="alert" className="text-xs text-rose-700 dark:text-rose-400 max-w-xs text-right animate-in fade-in slide-in-from-top-1">
            {health.warnings[0]}
          </div>
        )}
      </div>
    </div>
  );
};
