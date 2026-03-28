/*
    QRCraftly
    Copyright (C) 2025 fderuiter

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import QRTool from '@/components/QRTool';
import { DEFAULT_CONFIG } from '@/constants';
import { QRType } from '@/types';
import { safeJsonLdStringify } from '@/utils/security';

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
        "softwareVersion": "0.1.0",
        "image": "https://qrcraftly.com/og-image.png",
        "datePublished": "2025-01-01",
        "author": {
          "@id": "https://qrcraftly.com/#organization"
        },
        "browserRequirements": "Requires JavaScript. Works in all modern browsers.",
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
        "totalTime": "PT1M",
        "estimatedCost": {
          "@type": "MonetaryAmount",
          "currency": "USD",
          "value": "0"
        },
        "supply": [
          {
            "@type": "HowToSupply",
            "name": "WiFi Network Name (SSID)"
          },
          {
            "@type": "HowToSupply",
            "name": "WiFi Password"
          },
          {
            "@type": "HowToSupply",
            "name": "Encryption Type"
          }
        ],
        "tool": [
          {
            "@type": "HowToTool",
            "name": "QRCraftly WiFi Generator"
          }
        ],
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(schemaData) }} />
      <QRTool initialConfig={wifiConfig} title="WiFi QR Code" />
    </>
  );
}
