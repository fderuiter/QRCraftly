import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface ScannabilityStatusProps {
  isScannable: boolean | null; // null means checking or initial state
  errorReason?: string;
}

const ScannabilityStatus: React.FC<ScannabilityStatusProps> = ({ isScannable, errorReason }) => {
  if (isScannable === null) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-sm font-medium animate-pulse">
        <div className="w-4 h-4 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" />
        Checking scannability...
      </div>
    );
  }

  if (isScannable) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm font-medium border border-emerald-100 dark:border-emerald-800/30">
        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
        <span>Scannable</span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm font-medium border border-amber-200 dark:border-amber-800/30">
      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div>
        <div className="font-semibold mb-0.5">Unscannable Warning</div>
        <div className="text-amber-600 dark:text-amber-500 text-xs">
          {errorReason || "Design may be difficult to scan"}
        </div>
      </div>
    </div>
  );
};

export default ScannabilityStatus;
