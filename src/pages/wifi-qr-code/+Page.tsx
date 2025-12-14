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
    "@graph": [
      {
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
      },
      {
        "@type": "HowTo",
        "name": "How to create a WiFi QR Code",
        "description": "Generate a QR code that allows guests to connect to your WiFi network instantly without typing a password.",
        "step": [
          {
            "@type": "HowToStep",
            "name": "Enter Network Details",
            "text": "Input your WiFi network name (SSID) and select the encryption type (usually WPA/WPA2)."
          },
          {
            "@type": "HowToStep",
            "name": "Enter Password",
            "text": "Type your WiFi password. Your password is processed locally in your browser and never sent to any server."
          },
          {
            "@type": "HowToStep",
            "name": "Download QR Code",
            "text": "Click the Download button to save your WiFi QR code as an image."
          }
        ]
      }
    ]
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }} />
      <QRTool initialConfig={wifiConfig} title="WiFi QR Code" />
    </>
  );
}
