import React from 'react';
import QRTool from '@/components/QRTool';

/**
 * Home Page Component
 *
 * The main entry point for the application. It renders the `QRTool` component,
 * which provides the full QR code generation and customization interface.
 *
 * Also injects JSON-LD Structured Data for 'WebApplication' to improve SEO visibility.
 *
 * @returns {JSX.Element} The home page layout.
 */
export default function Page() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "QRCraftly",
    "url": "https://qrcraftly.com",
    "applicationCategory": "UtilitiesApplication",
    "operatingSystem": "Any",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "Generate beautiful, custom QR codes for free. No sign-up required. Secure, client-side generation.",
    "browserRequirements": "Requires JavaScript. Works in all modern browsers."
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <QRTool />
    </>
  );
}
