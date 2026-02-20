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
 * Payment QR Code Page Component
 */
export default function Page() {
  const schemaData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "name": "Payment QR Code Generator",
        "url": "https://qrcraftly.com/payment-qr-code",
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
        "featureList": "Generate Crypto Payment QR, Bitcoin/Ethereum Support, Secure Client-Side"
      },
      {
        "@type": "HowTo",
        "name": "How to Create a Payment QR Code",
        "description": "Generate a QR code to receive cryptocurrency payments.",
        "totalTime": "PT1M",
        "estimatedCost": {
          "@type": "MonetaryAmount",
          "currency": "USD",
          "value": "0"
        },
        "tool": [
          {
            "@type": "HowToTool",
            "name": "QRCraftly Payment Generator"
          }
        ],
        "step": [
          {
            "@type": "HowToStep",
            "name": "Select Network",
            "text": "Choose the cryptocurrency network (e.g., Bitcoin, Ethereum)."
          },
          {
            "@type": "HowToStep",
            "name": "Enter Address",
            "text": "Paste your wallet address and optional amount."
          },
          {
            "@type": "HowToStep",
            "name": "Customize & Download",
            "text": "Style your QR code and save it."
          }
        ]
      }
    ]
  };

  return <QRTypePage type={QRType.PAYMENT} title="Payment QR Code" schemaData={schemaData} />;
}
