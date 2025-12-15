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
        "name": "How to Create a WiFi QR Code",
        "description": "Generate a QR code to share your WiFi network instantly.",
        "step": [
          {
            "@type": "HowToStep",
            "name": "Enter Network Name",
            "text": "Input your WiFi SSID (Network Name) into the designated field."
          },
          {
            "@type": "HowToStep",
            "name": "Enter Password",
            "text": "Enter your WiFi password. Your data remains local and secure."
          },
          {
            "@type": "HowToStep",
            "name": "Select Encryption",
            "text": "Choose your network encryption type (WPA/WPA2 is most common)."
          },
          {
            "@type": "HowToStep",
            "name": "Download or Share",
            "text": "Click 'Download' to save the QR code or scan it directly from the screen."
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
