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

import React from 'react';
import './index.css';
import { ToastProvider } from '../components/ui/Toast';

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
  return (
    <ToastProvider>
      <main className="flex h-screen overflow-auto md:overflow-hidden bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 antialiased font-sans">
          {children}
      </main>
    </ToastProvider>
  );
}
