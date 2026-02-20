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
 * Phone QR Code Page Component
 */
export default function Page() {
  const schemaData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "name": "Phone QR Code Generator",
        "url": "https://qrcraftly.com/phone-qr-code",
        "applicationCategory": "Utilities",
        "operatingSystem": "All",
        "softwareVersion": "0.1.0",
        "image": "https://qrcraftly.com/og-image.png",
        "datePublished": "2025-01-01",
        "author": {
          "@type": "Organization",
          "name": "QRCraftly"
        },
        "browserRequirements": "Requires JavaScript. Works in all modern browsers.",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        },
        "featureList": "Generate Click-to-Call QR, Secure Client-Side, Custom Design"
      },
      {
        "@type": "HowTo",
        "name": "How to Create a Phone QR Code",
        "description": "Create a QR code that prompts the user to dial a number.",
        "totalTime": "PT1M",
        "estimatedCost": {
          "@type": "MonetaryAmount",
          "currency": "USD",
          "value": "0"
        },
        "tool": [
          {
            "@type": "HowToTool",
            "name": "QRCraftly Phone Generator"
          }
        ],
        "step": [
          {
            "@type": "HowToStep",
            "name": "Enter Number",
            "text": "Input the phone number you want people to call."
          },
          {
            "@type": "HowToStep",
            "name": "Customize",
            "text": "Choose colors and styles for your QR code."
          },
          {
            "@type": "HowToStep",
            "name": "Download",
            "text": "Download the image for print or digital use."
          }
        ]
      }
    ]
  };

  return <QRTypePage type={QRType.PHONE} title="Phone QR Code" schemaData={schemaData} />;
}
