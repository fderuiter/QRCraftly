import React from 'react';
import { QRStyle } from '../../types';

/**
 * Helper component for rendering pattern preview modules.
 */
export const PatternModule: React.FC<{ style: QRStyle }> = ({ style }) => {
  if (style === QRStyle.STARBURST) {
    return (
      <div className="flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      </div>
    );
  }
  if (style === QRStyle.HIVE) {
    // Hexagon clip path
    return (
      <div className="flex items-center justify-center bg-current" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
    );
  }
  if (style === QRStyle.SWISS) {
    return <div className="bg-current rounded-full" />;
  }
  if (style === QRStyle.MODERN) {
    return <div className="bg-current rounded-sm" />;
  }
  if (style === QRStyle.FLUID) {
    return <div className="bg-current rounded-lg" style={{ borderRadius: '50%' }} />;
  }
  if (style === QRStyle.CIRCUIT) {
    return (
      <div className="relative w-full h-full bg-transparent flex items-center justify-center">
        <div className="w-1.5 h-1.5 bg-current rounded-full" />
        <div className="absolute inset-0 border border-current opacity-50" />
      </div>
    );
  }
  if (style === QRStyle.GRUNGE) {
    return <div className="bg-current" style={{ clipPath: 'polygon(10% 0, 100% 10%, 90% 100%, 0 90%)' }} />;
  }
  // Standard and others
  return (
    <div className="bg-current" />
  );
};
