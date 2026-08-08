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

import React, { useEffect, useState } from 'react';
import './index.css';
import { ToastProvider } from '../components/ui/Toast';
import { ErrorBoundary } from '../components/ErrorBoundary';

/**
 * Helper to check if the application is currently running inside an E2E or unit/integration test environment.
 * To prevent accidental activation in production, it requires specific window test flags
 * that are only injected during test runs.
 */
function isTestExecution(): boolean {
  if (typeof window !== 'undefined') {
    const isE2E = !!(window as any).__E2E_TEST__;
    const isVitest = !!(window as any).__VITEST__ || typeof (window as any).vi !== 'undefined';
    const isLocalOrTestRunner = 
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '0.0.0.0' ||
      navigator.userAgent.includes('Headless');

    return (isE2E || isVitest) && isLocalOrTestRunner;
  }
  return typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true');
}

/**
 * CrashTrigger Component
 *
 * Safely simulates a rendering crash ONLY during E2E or Vitest test execution
 * when the simulate-crash or crash query parameter is set to true.
 * Uses client-side state and useEffect to execute post-hydration, avoiding SSR mismatch.
 */
function CrashTrigger() {
  const [shouldCrash, setShouldCrash] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && isTestExecution()) {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('simulate-crash') === 'true' || urlParams.get('crash') === 'true') {
          setShouldCrash(true);
        }
      } catch (e) {
        console.error('Failed to parse query parameters for CrashTrigger:', e);
      }
    }
  }, []);

  if (shouldCrash) {
    throw new Error('Simulated client-side rendering crash');
  }

  return null;
}

/**
 * LayoutDefault Component
 *
 * Provides the default layout structure for the application.
 * It sets up the main container with full height, background color, text color,
 * and font settings. It also handles scrolling behavior for mobile vs desktop.
 * @param props - The component props.
 * @param props.children - The child components to render within the layout.
 * @returns The layout wrapper.
 */
export default function LayoutDefault({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  return (
    <ToastProvider>
      <a
        href="#main-content"
        className="sr-only transition-all focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:border-2 focus:border-teal-700 focus:bg-white focus:px-4 focus:py-2 focus:text-teal-700 focus:shadow-lg focus:outline-none dark:focus:bg-slate-800 dark:focus:text-teal-400"
      >
        Skip to main content
      </a>
      <main
        id="main-content"
        tabIndex={-1}
        className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-700 antialiased focus:outline-none dark:bg-slate-900 dark:text-slate-200"
        data-hydrated={hydrated}
      >
        <ErrorBoundary>
          <CrashTrigger />
          {children}
        </ErrorBoundary>
      </main>
    </ToastProvider>
  );
}
