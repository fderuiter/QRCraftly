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

import { QRTypePage } from '@/components/QRTypePage';
import { QRType } from '@/types';

/**
 * VCard QR Code Page Component
 */
export default function Page() {
  const schemaData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "name": "VCard QR Code Generator",
        "url": "https://qrcraftly.com/vcard-qr-code",
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
        "featureList": "Generate VCard Contact QR, Secure Client-Side, Custom Design"
      },
      {
        "@type": "HowTo",
        "name": "How to Create a VCard QR Code",
        "description": "Create a digital business card that can be scanned to save contact info.",
        "totalTime": "PT1M",
        "estimatedCost": {
          "@type": "MonetaryAmount",
          "currency": "USD",
          "value": "0"
        },
        "tool": [
          {
            "@type": "HowToTool",
            "name": "QRCraftly VCard Generator"
          }
        ],
        "step": [
          {
            "@type": "HowToStep",
            "name": "Enter Contact Info",
            "text": "Fill in your name, phone, email, and other contact details."
          },
          {
            "@type": "HowToStep",
            "name": "Customize",
            "text": "Add your logo or choose colors to match your brand."
          },
          {
            "@type": "HowToStep",
            "name": "Download",
            "text": "Download the QR code for your business cards."
          }
        ]
      }
    ]
  };

  return <QRTypePage type={QRType.VCARD} title="VCard QR Code" schemaData={schemaData} />;
}
