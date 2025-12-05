import React from 'react';
import QRTool from '@/components/QRTool';
import { DEFAULT_CONFIG } from '@/constants';

export default function Page() {
  const wifiConfig = {
    ...DEFAULT_CONFIG,
    type: 'wifi' as const,
  };

  return (
    <QRTool initialConfig={wifiConfig} />
  );
}
