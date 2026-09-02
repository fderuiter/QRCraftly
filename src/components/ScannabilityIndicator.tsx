import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Loader2, ShieldX } from 'lucide-react';
import { ScannabilityStatus, HealthScore } from '../hooks/useScannability';
import { getExportRiskPolicy } from '../utils/exportRiskPolicy';

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
 * Renders the scannability indicators and supports debounced live region announcements
 * and keyboard shortcuts for immediate visual focus accessibility.
 * @param root0 - The props object.
 * @param root0.status - The current scannability status.
 * @param root0.health - The optional health score with warnings.
 * @returns The scannability feedback element.
 */
export const ScannabilityIndicator: React.FC<Props> = ({ status, health }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [announcement, setAnnouncement] = useState('');

  // 1. Debounce screen reader announcements by 1000ms
  useEffect(() => {
    const text = getAnnouncementText(status, health);

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

  // 2. Global keyboard shortcut (Alt + S / Alt + s) to focus the scannability card
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Alt + S keydown (global keybind)
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        containerRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (status === 'idle') {
    return <div className="inline-block h-13 w-auto" data-testid="scannability-indicator-placeholder" />;
  }

  const showHealth = health && health.score < 100;
  const exportRisk = getExportRiskPolicy({ status, health });

  /* eslint-disable jsx-a11y/no-noninteractive-tabindex */
  return (
    <div
      ref={containerRef}
      tabIndex={0}
      aria-label="Scannability feedback"
      className="flex h-13 flex-col items-end justify-start rounded-lg transition-all duration-300 select-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 focus:outline-none dark:focus:ring-teal-400 dark:focus:ring-offset-slate-900"
      data-testid="scannability-feedback-wrapper"
    >
      {/* 
        Visually hidden polite live-region element. 
        Uses aria-live="polite" and role="status" to ensure compatibility.
      */}
      <div
        className="sr-only"
        aria-live="polite"
        role="status"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: '0',
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          borderWidth: '0',
        }}
      >
        {announcement}
      </div>

      <div
        role={status === 'fail' && !(showHealth && health?.warnings && health.warnings.length > 0) ? 'alert' : undefined}
        aria-live="off"
        className="flex items-center gap-1.5 rounded-full border bg-white px-2 py-1 text-xs font-medium shadow-sm transition-all duration-300 dark:bg-slate-800"
      >
        {status === 'checking' && (
          <>
            <Loader2 className="size-3.5 animate-spin text-slate-500" />
            <span className="text-slate-600 dark:text-slate-300">Checking...</span>
          </>
        )}
        {status === 'physical-pass' && (
          <>
            <ShieldCheck className="size-3.5 text-emerald-500" />
            <span className="text-emerald-700 dark:text-emerald-400">Print simulation verified</span>
          </>
        )}
        {status === 'digital-pass' && (
          <>
            <ShieldCheck className="size-3.5 text-amber-500" />
            <span className="text-emerald-700 dark:text-emerald-400">Screen scan verified</span>
          </>
        )}
        {status === 'fail' && (
          <>
            <ShieldX className="size-3.5 text-rose-500" />
            <span className="text-rose-700 dark:text-rose-400">Scan verification failed</span>
          </>
        )}
        {health && (
          <span className={`ml-1 rounded-full px-1.5 text-[10px] ${exportRisk === 'safe' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300' : exportRisk === 'caution' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300'}`}>
            Health: {health.score}
          </span>
        )}
      </div>
      <div className="mt-1 flex h-5 w-full items-center justify-end">
        {status === 'digital-pass' && (!showHealth || health.warnings.length === 0) && (
          <div className="max-w-xs text-right text-xs text-amber-700 dark:text-amber-400">
            Test with a physical camera before large print runs.
          </div>
        )}
        {showHealth && health.warnings.length > 0 && (
          <div
            role="alert"
            aria-live="off"
            className={`animate-in fade-in slide-in-from-top-1 max-w-xs text-right text-xs ${exportRisk === 'unsafe' ? 'text-rose-700 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400'}`}
          >
            {health.warnings[0]}
          </div>
        )}
      </div>
    </div>
  );
  /* eslint-enable jsx-a11y/no-noninteractive-tabindex */
};
