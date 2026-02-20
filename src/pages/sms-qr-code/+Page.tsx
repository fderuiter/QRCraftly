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
 * SMS QR Code Page Component
 */
export default function Page() {
  const schemaData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "name": "SMS QR Code Generator",
        "url": "https://qrcraftly.com/sms-qr-code",
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
        "featureList": "Generate Pre-filled SMS, Secure Client-Side, Custom Design"
      },
      {
        "@type": "HowTo",
        "name": "How to Create an SMS QR Code",
        "description": "Generate a QR code that opens a drafted text message.",
        "totalTime": "PT1M",
        "estimatedCost": {
          "@type": "MonetaryAmount",
          "currency": "USD",
          "value": "0"
        },
        "tool": [
          {
            "@type": "HowToTool",
            "name": "QRCraftly SMS Generator"
          }
        ],
        "step": [
          {
            "@type": "HowToStep",
            "name": "Enter Details",
            "text": "Fill in the recipient number and the message text."
          },
          {
            "@type": "HowToStep",
            "name": "Customize",
            "text": "Select a pattern and color for your QR code."
          },
          {
            "@type": "HowToStep",
            "name": "Download",
            "text": "Download the image and share it."
          }
        ]
      }
    ]
  };

  return <QRTypePage type={QRType.SMS} title="SMS QR Code" schemaData={schemaData} />;
}
