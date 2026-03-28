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
import { safeJsonLdStringify } from '@/utils/security';

/**
 * Home Page Component
 *
 * The main entry point for the application. It renders the `QRTool` component,
 * which provides the full QR code generation and customization interface.
 *
 * @returns {JSX.Element} The home page layout.
 */
export default function Page() {
  const schemaData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "name": "QRCraftly",
        "url": "https://qrcraftly.com",
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
        "featureList": "Custom QR Codes, WiFi QR Codes, vCard, Secure Client-Side Generation, Artistic Styles"
      },
      {
        "@type": "HowTo",
        "name": "How to Create a URL QR Code",
        "description": "Convert any website URL into a scannable QR code instantly.",
        "totalTime": "PT1M",
        "estimatedCost": {
          "@type": "MonetaryAmount",
          "currency": "USD",
          "value": "0"
        },
        "tool": [
          {
            "@type": "HowToTool",
            "name": "QRCraftly URL Generator"
          }
        ],
        "step": [
          {
            "@type": "HowToStep",
            "name": "Enter URL",
            "text": "Paste your website address (URL) into the input field."
          },
          {
            "@type": "HowToStep",
            "name": "Customize Design",
            "text": "Adjust colors, add a logo, or change the pattern style."
          },
          {
            "@type": "HowToStep",
            "name": "Download QR Code",
            "text": "Save your custom QR code in PNG, JPEG, or WebP format."
          }
        ]
      }
    ]
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(schemaData) }} />
      <QRTool />
    </>
  );
}
