import React from 'react';
import './index.css';

export default function LayoutDefault({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-auto md:overflow-hidden bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 antialiased font-sans">
        {children}
    </div>
  );
}
