import React, { useState, useEffect } from 'react';
import { ShieldCheck, Loader2, ShieldX } from 'lucide-react';
import { ScannabilityStatus, HealthScore } from '../hooks/useScannability';
import { getExportRiskPolicy } from '../utils/exportRiskPolicy';

interface Props {
  status: ScannabilityStatus;
  health?: HealthScore;
  onAutoFixContrast?: () => void;
  onResetDefault?: () => void;
}

/**
 * Helper to build descriptive, polite screen reader announcement messages.
 * @param status - The current scannability status.
 * @param health - The optional health score with warnings.
 * @returns The built announcement text.
 */
const getAnnouncementText = (status: ScannabilityStatus, health?: HealthScore): string => {
  if (status === 'checking') {
    return 'Checking scannability...';
  }
  if (status === 'physical-pass') {
    const scorePart = health ? ` Health score: ${health.score}.` : '';
    return `Scannability status: Print simulation verified.${scorePart}`;
  }
  if (status === 'digital-pass') {
    const scorePart = health ? ` Health score: ${health.score}.` : '';
    return `Scannability status: Screen scan verified.${scorePart} Test with a physical camera before large print runs.`;
  }
  if (status === 'fail') {
    const scorePart = health ? ` Health score: ${health.score}.` : '';
    const warningPart = health && health.warnings && health.warnings.length > 0
      ? ` Warning: ${health.warnings[0]}.`
      : '';
    return `Scannability status: Scan verification failed.${scorePart}${warningPart}`;
  }
  return '';
};

/**
 * Renders the scannability status badge.
 *
 * Announcement model: routine updates (checking, verified) go through one polite, debounced
 * `role="status"` region; a failure is rendered once in a `role="alert"` element so it is
 * announced immediately and exactly once. The visible badge itself has no live role, the
 * output is not focusable, and there is no global keyboard shortcut.
 * @param root0 - The props object.
 * @param root0.status - The current scannability status.
 * @param root0.health - The optional health score with warnings.
 * @returns The scannability feedback element.
 */
export const ScannabilityIndicator: React.FC<Props> = ({
  status,
  health,
  onAutoFixContrast,
  onResetDefault,
}) => {
  const [announcement, setAnnouncement] = useState('');

  // Debounce polite announcements by 1000ms so typing does not produce a stream of updates.
  // Failures are announced by the alert element below instead, never by this region.
  useEffect(() => {
    const text = status === 'fail' ? '' : getAnnouncementText(status, health);

    // Clear active announcement immediately during inputs to prevent ongoing alerts
    setAnnouncement('');

    if (!text) return;

    const timer = setTimeout(() => {
      setAnnouncement(text);
    }, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [status, health]);

  const politeRegion = (
    <div className="sr-only" role="status" aria-live="polite" data-testid="scannability-status-region">
      {announcement}
    </div>
  );

  if (status === 'idle') {
    return (
      <div className="inline-block h-13 w-auto" data-testid="scannability-indicator-placeholder">
        {politeRegion}
      </div>
    );
  }

  const showHealth = health && health.score < 100;
  const exportRisk = getExportRiskPolicy({ status, health });
  const firstWarning = showHealth && health.warnings.length > 0 ? health.warnings[0] : null;

  return (
    <div
      className="flex h-13 flex-col items-end justify-start rounded-lg select-none"
      data-testid="scannability-feedback-wrapper"
    >
      {politeRegion}

      <div className="flex items-center gap-1.5 rounded-full border bg-white px-2 py-1 text-xs font-medium shadow-sm motion-safe:transition-colors motion-safe:duration-300 dark:bg-slate-800">
        {status === 'checking' && (
          <>
            <Loader2 className="size-3.5 text-slate-500 motion-safe:animate-spin" aria-hidden="true" />
            <span className="text-slate-600 dark:text-slate-300">Checking...</span>
          </>
        )}
        {status === 'physical-pass' && (
          <>
            <ShieldCheck className="size-3.5 text-emerald-500" aria-hidden="true" />
            <span className="text-emerald-700 dark:text-emerald-400">Print simulation verified</span>
          </>
        )}
        {status === 'digital-pass' && (
          <>
            <ShieldCheck className="size-3.5 text-amber-500" aria-hidden="true" />
            <span className="text-emerald-700 dark:text-emerald-400">Screen scan verified</span>
          </>
        )}
        {status === 'fail' && (
          <>
            <ShieldX className="size-3.5 text-rose-500" aria-hidden="true" />
            <span className="text-rose-700 dark:text-rose-400">Scan verification failed</span>
          </>
        )}
        {health && (
          <span className={`ml-1 rounded-full px-1.5 text-xs ${exportRisk === 'safe' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300' : exportRisk === 'caution' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300'}`}>
            Health: {health.score}
          </span>
        )}
      </div>
      <div className="mt-1 flex w-full flex-col items-end justify-start gap-1 text-right">
        {status === 'digital-pass' && !firstWarning && (
          <div className="max-w-xs text-xs text-amber-700 dark:text-amber-400">
            Test with a physical camera before large print runs.
          </div>
        )}
        {status === 'fail' ? (
          <>
            <div
              role="alert"
              className={`max-w-xs text-xs text-rose-700 dark:text-rose-400 ${firstWarning ? '' : 'sr-only'}`}
              data-testid="scannability-alert"
            >
              {firstWarning ?? 'Scan verification failed. Adjust colors, pattern, or margin before exporting.'}
            </div>
            {(onAutoFixContrast || onResetDefault) && (
              <div className="flex items-center gap-1.5 pt-0.5" data-testid="scannability-recovery-actions">
                {onAutoFixContrast && (
                  <button
                    type="button"
                    onClick={onAutoFixContrast}
                    className="rounded bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 hover:bg-rose-100 focus:ring-2 focus:ring-rose-500 focus:ring-offset-1 focus:outline-none dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60"
                  >
                    Auto-Fix Contrast
                  </button>
                )}
                {onResetDefault && (
                  <button
                    type="button"
                    onClick={onResetDefault}
                    className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-200 focus:ring-2 focus:ring-slate-500 focus:ring-offset-1 focus:outline-none dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Reset Defaults
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          firstWarning && (
            <div
              className={`max-w-xs text-xs ${exportRisk === 'unsafe' ? 'text-rose-700 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400'}`}
            >
              {firstWarning}
            </div>
          )
        )}
      </div>
    </div>
  );
};
