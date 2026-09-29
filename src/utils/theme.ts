/*
    QRCraftly
    Copyright (C) 2025 fderuiter

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

/**
 * The colour theme a visitor has chosen. `system` follows `prefers-color-scheme`.
 */
export type ThemePreference = 'light' | 'dark' | 'system';

/**
 * The theme actually applied to the document once `system` is resolved.
 */
export type ResolvedTheme = 'light' | 'dark';

/**
 * The single allowlisted persistent storage key for the theme preference.
 * It only ever holds `light`, `dark` or `system`; QR content is never stored with it.
 */
export const THEME_STORAGE_KEY = 'qrcraftly:theme';

/** Media query used to follow the operating-system colour scheme. */
export const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

/** Order in which the theme toggle cycles through the preferences. */
const THEME_CYCLE: readonly ThemePreference[] = ['system', 'light', 'dark'];

/**
 * Narrows an unknown stored value to a theme preference.
 * @param value - Raw value read from storage.
 * @returns The matching preference, or `system` for anything unrecognised.
 */
export function parseThemePreference(value: string | null | undefined): ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
}

/**
 * Resolves a preference against the current system colour scheme.
 * @param preference - The visitor's preference.
 * @param systemPrefersDark - Whether the OS currently prefers a dark scheme.
 * @returns The theme to apply.
 */
export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  if (preference === 'system') return systemPrefersDark ? 'dark' : 'light';
  return preference;
}

/**
 * Returns the preference that follows `current` in the toggle cycle.
 * @param current - The active preference.
 * @returns The next preference.
 */
export function nextThemePreference(current: ThemePreference): ThemePreference {
  const index = THEME_CYCLE.indexOf(current);
  return THEME_CYCLE[(index + 1) % THEME_CYCLE.length] ?? 'system';
}

/**
 * Reads the stored preference. Storage can be unavailable (private mode, SSR), so every
 * access is guarded and falls back to `system`.
 * @returns The stored preference.
 */
export function readStoredThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  try {
    return parseThemePreference(window.localStorage.getItem('qrcraftly:theme'));
  } catch {
    return 'system';
  }
}

/**
 * Persists the preference. Failures (quota, disabled storage) are ignored: the theme
 * still applies for the current page view.
 * @param preference - The preference to store.
 */
export function writeStoredThemePreference(preference: ThemePreference): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem('qrcraftly:theme', preference);
  } catch {
    // Storage unavailable; keep the in-memory preference only.
  }
}

/**
 * Reports whether the operating system currently prefers a dark colour scheme.
 * @returns True when `prefers-color-scheme: dark` matches.
 */
export function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(DARK_SCHEME_QUERY).matches;
}

/**
 * Applies a resolved theme to the root element: the `dark` class drives Tailwind's
 * `dark:` variant, and `color-scheme` themes native controls and scrollbars.
 * @param theme - The theme to apply.
 * @param root - The element to update (defaults to `<html>`).
 */
export function applyThemeToDocument(theme: ResolvedTheme, root: HTMLElement = document.documentElement): void {
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
  root.dataset.theme = theme;
}

/**
 * Pre-hydration script rendered inline in `<head>`. It applies the stored or system theme
 * before first paint so reloading never flashes the wrong theme. It must stay a static
 * string: `scripts/csp_hash_injector.js` hashes it from the built HTML and adds that
 * SHA-256 hash to `script-src`, so no `unsafe-inline` is needed in production.
 * It mirrors `readStoredThemePreference`, `resolveTheme` and `applyThemeToDocument`.
 */
export const THEME_INIT_SCRIPT =
  "(function(){try{var p=window.localStorage.getItem('qrcraftly:theme');" +
  "var d=p==='dark'||(p!=='light'&&typeof window.matchMedia==='function'&&window.matchMedia('(prefers-color-scheme: dark)').matches);" +
  "var r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light';r.setAttribute('data-theme',d?'dark':'light');" +
  "}catch(e){}})();";
