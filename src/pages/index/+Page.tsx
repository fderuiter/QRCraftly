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
      },
      {
        "@type": "HowTo",
        "name": "How to Create a Custom QR Code",
        "description": "Create a free, custom QR code in seconds. No sign-up required.",
        "image": "https://qrcraftly.com/og-image.png",
        "step": [
          {
            "@type": "HowToStep",
            "name": "Select Content Type",
            "text": "Choose from URL, Text, WiFi, vCard, and more."
          },
          {
            "@type": "HowToStep",
            "name": "Enter Details",
            "text": "Input your content such as website URL or contact information."
          },
          {
            "@type": "HowToStep",
            "name": "Customize Design",
            "text": "Choose colors, patterns (like Hive or Starburst), and add a logo."
          },
          {
            "@type": "HowToStep",
            "name": "Download",
            "text": "Download your high-quality QR code in PNG or SVG format."
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
