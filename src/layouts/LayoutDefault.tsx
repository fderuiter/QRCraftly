import React from 'react';
import './index.css';

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
    <main className="flex h-screen overflow-auto md:overflow-hidden bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 antialiased font-sans">
        {children}
    </main>
  );
}
