import React from 'react';
import QRTool from '@/components/QRTool';
import { DEFAULT_CONFIG } from '@/constants';
import { QRType } from '@/types';

/**
 * WiFi QR Code Page Component
 *
 * A specialized landing page that pre-configures the `QRTool` for WiFi QR code generation.
 * This can be used for SEO landing pages or direct links to specific functionality.
 *
 * @returns {JSX.Element} The WiFi QR code page layout.
 */
export default function Page() {
  const wifiConfig = {
    ...DEFAULT_CONFIG,
    type: QRType.WIFI,
  };

  const schemaData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "WiFi QR Code Generator",
    "url": "https://qrcraftly.com/wifi-qr-code",
    "applicationCategory": "Utilities",
    "operatingSystem": "All",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "featureList": "Generate WiFi Access QR Codes, WPA/WPA2 Support, Hidden SSID Support"
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }} />
      <QRTool initialConfig={wifiConfig} title="WiFi QR Code" />
    </>
  );
}
