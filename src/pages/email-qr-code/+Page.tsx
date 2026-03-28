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
 * Email QR Code Page Component
 */
export default function Page() {
  const schemaData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "name": "Email QR Code Generator",
        "url": "https://qrcraftly.com/email-qr-code",
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
        "featureList": "Generate Pre-filled Emails, Secure Client-Side, Custom Design"
      },
      {
        "@type": "HowTo",
        "name": "How to Create an Email QR Code",
        "description": "Generate a QR code that opens a drafted email.",
        "totalTime": "PT1M",
        "estimatedCost": {
          "@type": "MonetaryAmount",
          "currency": "USD",
          "value": "0"
        },
        "tool": [
          {
            "@type": "HowToTool",
            "name": "QRCraftly Email Generator"
          }
        ],
        "step": [
          {
            "@type": "HowToStep",
            "name": "Enter Details",
            "text": "Fill in the recipient, subject, and body of the email."
          },
          {
            "@type": "HowToStep",
            "name": "Customize",
            "text": "Choose a style and color for your QR code."
          },
          {
            "@type": "HowToStep",
            "name": "Download",
            "text": "Save the QR code and print it on business cards or flyers."
          }
        ]
      }
    ]
  };

  return <QRTypePage type={QRType.EMAIL} title="Email QR Code" schemaData={schemaData} />;
}
