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
    "@type": "WebApplication",
    "name": "QRCraftly",
    "url": "https://qrcraftly.com",
    "applicationCategory": "Utilities",
    "operatingSystem": "All",
    "softwareVersion": "0.1.0",
    "image": "https://qrcraftly.com/favicon.png",
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
    "featureList": "Custom QR Codes, WiFi QR Codes, vCard, Secure Client-Side Generation, Artistic Styles"
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(schemaData) }} />
      <QRTool />
    </>
  );
}
