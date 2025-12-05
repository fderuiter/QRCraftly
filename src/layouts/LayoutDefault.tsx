import React from 'react';
import './index.css';

export default function LayoutDefault({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-700 antialiased font-sans">
        {children}
    </div>
  );
}
