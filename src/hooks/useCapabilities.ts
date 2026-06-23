import { useState, useEffect } from 'react';

export type BrowserEngine = 'WebKit' | 'Chromium' | 'Firefox' | 'Unknown';

export interface Capabilities {
  engine: BrowserEngine;
  canSaveFilePicker: boolean;
  canShare: boolean;
}

export function useCapabilities(): Capabilities {
  const [capabilities, setCapabilities] = useState<Capabilities>({
    engine: 'Unknown',
    canSaveFilePicker: false,
    canShare: false,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const userAgent = navigator.userAgent;
    let engine: BrowserEngine = 'Unknown';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      engine = 'WebKit';
    } else if (userAgent.includes('Firefox')) {
      engine = 'Firefox';
    } else if (userAgent.includes('Chrome')) {
      engine = 'Chromium';
    }

    const canSaveFilePicker = 'showSaveFilePicker' in window && typeof (window as any).showSaveFilePicker === 'function';
    
    const canShare = 'share' in navigator && typeof navigator.share === 'function' && 
                     'canShare' in navigator && typeof navigator.canShare === 'function';

    setCapabilities({
      engine,
      canSaveFilePicker,
      canShare,
    });
  }, []);

  return capabilities;
}

