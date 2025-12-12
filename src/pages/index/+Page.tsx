import React from 'react';
import QRTool from '@/components/QRTool';

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
    "@type": "WebApplication",
    "name": "QRCraftly",
    "url": "https://qrcraftly.com",
    "applicationCategory": "Utilities",
    "operatingSystem": "All",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "featureList": "Custom QR Codes, WiFi QR Codes, vCard, Secure Client-Side Generation, Artistic Styles"
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }} />
      <QRTool />
    </>
  );
}
