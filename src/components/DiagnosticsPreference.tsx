/*
    QRCraftly
    Copyright (C) 2026 fderuiter

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { ToggleSwitch } from './ui/ToggleSwitch';

/**
 * Props for {@link DiagnosticsPreference}.
 */
export interface DiagnosticsPreferenceProps {
  /** Current opt-in: `true` allowed, `false` declined, `null` not chosen yet (treated as off). */
  optIn: boolean | null;
  /** Called with the new choice. */
  onChange: (optIn: boolean) => void;
}

/**
 * Privacy settings panel for the anonymous scannability diagnostics preference.
 * Diagnostics stay off until the person turns them on here; nothing is sent while unset.
 * @param props - Current preference and change handler.
 * @param props.optIn
 * @param props.onChange
 * @returns The privacy settings section.
 */
export function DiagnosticsPreference({ optIn, onChange }: DiagnosticsPreferenceProps) {
  const statusText = optIn === true ? 'On' : optIn === false ? 'Off' : 'Off (not chosen yet)';

  return (
    <section id="privacy-settings" aria-labelledby="privacy-settings-title" className="max-w-xl">
      <h2
        id="privacy-settings-title"
        className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-900 uppercase dark:text-slate-200"
      >
        <ShieldCheck className="size-4 text-teal-700 dark:text-teal-400" aria-hidden="true" /> Privacy settings
      </h2>
      <p id="diagnostics-description" className="mb-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        If a scan check fails, QRCraftly can send your browser engine and QR style settings to help improve scanning. QR content and images are never sent.{' '}
        <a href="/security#compliance" className="font-medium text-teal-700 underline underline-offset-2 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300">
          How we handle data
        </a>
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <ToggleSwitch
          id="diagnostics-opt-in"
          label="Share anonymous diagnostics"
          checked={optIn === true}
          onChange={onChange}
          aria-describedby="diagnostics-description"
        />
        <span className="text-xs text-slate-500 dark:text-slate-400" data-testid="diagnostics-status">
          {statusText}
        </span>
      </div>
    </section>
  );
}
