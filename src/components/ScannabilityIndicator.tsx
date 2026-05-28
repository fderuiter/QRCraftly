import React from 'react';
import { ShieldCheck, Loader2, ShieldX } from 'lucide-react';
import { ScannabilityStatus } from '../hooks/useScannability';

interface Props {
  status: ScannabilityStatus;
}

export const ScannabilityIndicator: React.FC<Props> = ({ status }) => {
  if (status === 'idle') return null;

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-medium bg-white dark:bg-slate-800 shadow-sm transition-all duration-300">
      {status === 'checking' && (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
          <span className="text-slate-600 dark:text-slate-300">Checking...</span>
        </>
      )}
      {status === 'pass' && (
        <>
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-emerald-700 dark:text-emerald-400">Scannable</span>
        </>
      )}
      {status === 'fail' && (
        <>
          <ShieldX className="w-3.5 h-3.5 text-rose-500" />
          <span className="text-rose-700 dark:text-rose-400">Low Scannability</span>
        </>
      )}
    </div>
  );
};
