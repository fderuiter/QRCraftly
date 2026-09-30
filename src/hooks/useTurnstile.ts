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

import { useCallback, useEffect, useRef, useState } from 'react';

/** Cloudflare Turnstile loader in explicit-render mode. Needs `https://challenges.cloudflare.com` in CSP `script-src` and `frame-src`. */
export const TURNSTILE_SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/** Subset of the `window.turnstile` API used here. */
export interface TurnstileApi {
  render(
    container: HTMLElement,
    options: {
      /** Public site key. */
      sitekey: string;
      /** Receives a fresh token after a solved challenge. */
      callback: (token: string) => void;
      /** Called when the token expires. */
      'expired-callback'?: () => void;
      /** Called when the challenge fails to run. */
      'error-callback'?: () => void;
    },
  ): string | undefined;
  reset(widgetId?: string): void;
  remove(widgetId: string): void;
}

declare global {
  /** Browser window, extended with the Turnstile global. */
  interface Window {
    /** Global installed by the Turnstile script. */
    turnstile?: TurnstileApi;
  }
}

/** Widget lifecycle: `unconfigured` when no site key is set, `error` when the script or challenge failed. */
export type TurnstileStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unconfigured';

let scriptPromise: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!scriptPromise) {
    scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = TURNSTILE_SCRIPT_SRC;
      script.async = true;
      script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile did not initialise')));
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error('Turnstile script failed to load'));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

/**
 * Renders the real Cloudflare Turnstile widget into `containerRef` and exposes the
 * resulting single-use token. The third-party script is only loaded while
 * `enabled` is true (the user opted into dynamic links) and a site key is set.
 * @param siteKey - Public Turnstile site key (`VITE_TURNSTILE_SITE_KEY`).
 * @param enabled - Whether the widget should be mounted.
 * @returns Container ref, current token, status and a reset function.
 */
export function useTurnstile(siteKey: string | undefined, enabled: boolean) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | undefined>(undefined);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<TurnstileStatus>('idle');

  useEffect(() => {
    if (!enabled) return;
    if (!siteKey) {
      setStatus('unconfigured');
      return;
    }
    let cancelled = false;
    setStatus('loading');
    loadTurnstile()
      .then((api) => {
        if (cancelled || !containerRef.current) return;
        widgetIdRef.current = api.render(containerRef.current, {
          sitekey: siteKey,
          callback: (value) => setToken(value),
          'expired-callback': () => setToken(null),
          'error-callback': () => {
            setToken(null);
            setStatus('error');
          },
        });
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
      const widgetId = widgetIdRef.current;
      widgetIdRef.current = undefined;
      if (widgetId) window.turnstile?.remove(widgetId);
      setToken(null);
    };
  }, [siteKey, enabled]);

  /** Tokens are single use: call after every submission to get a fresh challenge. */
  const reset = useCallback(() => {
    setToken(null);
    if (widgetIdRef.current) window.turnstile?.reset(widgetIdRef.current);
  }, []);

  return { containerRef, token, status, reset };
}
