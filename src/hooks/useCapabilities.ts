import { useState, useEffect } from 'react';

type BrowserEngine = 'WebKit' | 'Chromium' | 'Firefox' | 'Unknown';

interface Capabilities {
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

    const canSaveFilePicker = 'showSaveFilePicker' in window && typeof window.showSaveFilePicker === 'function';
    
    // Sharing is offered only where the browser can share an image file, not just text.
    let canShare = false;
    try {
      canShare = typeof navigator.share === 'function' && typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [new File([''], 'qr.png', { type: 'image/png' })] });
    } catch {
      canShare = false;
    }

    setCapabilities({
      engine,
      canSaveFilePicker,
      canShare,
    });
  }, []);

  return capabilities;
}

