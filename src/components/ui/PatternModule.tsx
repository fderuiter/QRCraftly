import React from 'react';
import { QRStyle } from '../../types';

const patternRenderers: Record<QRStyle, React.ReactNode> = {
  [QRStyle.STARBURST]: (
    <div className="flex items-center justify-center">
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    </div>
  ),
  [QRStyle.HIVE]: (
    <div className="flex items-center justify-center">
      <svg viewBox="0 0 100 100" fill="currentColor" className="h-full w-full">
        <polygon points="50,0 100,25 100,75 50,100 0,75 0,25" />
      </svg>
    </div>
  ),
  [QRStyle.SWISS]: <div className="bg-current rounded-full" />,
  [QRStyle.MODERN]: <div className="bg-current rounded-sm" />,
  [QRStyle.FLUID]: <div className="bg-current rounded-full" />,
  [QRStyle.CIRCUIT]: (
    <div className="bg-transparent flex h-full items-center justify-center relative w-full">
      <div className="bg-current h-1.5 rounded-full w-1.5" />
      <div className="absolute border border-current inset-0 opacity-50" />
    </div>
  ),
  [QRStyle.GRUNGE]: (
    <div className="flex items-center justify-center">
      <svg viewBox="0 0 100 100" fill="currentColor" className="h-full w-full">
        <polygon points="10,0 100,10 90,100 0,90" />
      </svg>
    </div>
  ),
  [QRStyle.STANDARD]: <div className="bg-current" />,
};

/**
 * Helper component for rendering pattern preview modules.
 * @param root0
 * @param root0.style
 */
export const PatternModule: React.FC<{ style: QRStyle }> = ({ style }) => {
  return <>{patternRenderers[style] || patternRenderers[QRStyle.STANDARD]}</>;
};
