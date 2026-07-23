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
 * LayoutDefault Component
 *
 * Provides the default layout structure for the application.
 * It sets up the main container with full height, background color, text color,
 * and font settings. It also handles scrolling behavior for mobile vs desktop.
 *
 * @param {Object} props - The component props.
 * @param {React.ReactNode} props.children - The child components to render within the layout.
 * @returns {JSX.Element} The layout wrapper.
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
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white dark:focus:bg-slate-800 focus:text-teal-700 dark:focus:text-teal-400 focus:border-2 focus:border-teal-700 focus:rounded-lg focus:outline-none focus:shadow-lg transition-all"
      >
        Skip to main content
      </a>
      <main
        id="main-content"
        tabIndex={-1}
        className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 antialiased font-sans focus:outline-none"
        data-hydrated={hydrated}
      >
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
    </ToastProvider>
  );
}
