import React from 'react';
import { usePageContext } from 'vike-react/usePageContext';

/**
 * HeadDefault Component
 *
 * Renders the default `<head>` meta tags and link elements for the application.
 * This includes viewport settings, description, favicon, font preconnections,
 * and global structured data (JSON-LD) for SEO.
 *
 * Optimized to load Google Fonts non-blockingly to improve First Contentful Paint.
 *
 * @returns {JSX.Element} The fragment containing meta and link tags.
 */
export default function HeadDefault() {
  const fontUrl = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap";

  const pageContext = usePageContext();
  // Ensure we don't end up with double slashes if urlPathname is just '/'
  const path = pageContext.urlPathname === '/' ? '' : pageContext.urlPathname;

  // Define domain constant to ensure consistency
  const DOMAIN = "https://qrcraftly.com";
  const canonicalUrl = `${DOMAIN}${path}`;

  const schemaData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "QRCraftly",
    "url": DOMAIN,
    "description": "Free, secure, and client-side QR code generator with zero-knowledge architecture.",
    "publisher": {
      "@type": "Organization",
      "name": "QRCraftly",
      "logo": {
        "@type": "ImageObject",
        "url": `${DOMAIN}/favicon.png`
      }
    }
  };

  // Breadcrumb Schema Generation
  const breadcrumbItems = [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": `${DOMAIN}/`
    }
  ];

  if (pageContext.urlPathname === '/about') {
    breadcrumbItems.push({
      "@type": "ListItem",
      "position": 2,
      "name": "About",
      "item": `${DOMAIN}/about`
    });
  } else if (pageContext.urlPathname === '/wifi-qr-code') {
    breadcrumbItems.push({
      "@type": "ListItem",
      "position": 2,
      "name": "WiFi QR Code",
      "item": `${DOMAIN}/wifi-qr-code`
    });
  }

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbItems
  };

  return (
    <>
      {/*
        Note: 'viewport' and 'description' are handled by Vike/Config to avoid duplicates.
        Build output confirmed Vike injects: <meta name="viewport" content="width=device-width,initial-scale=1">

        The 'title' is also injected by Vike based on +config.ts
      */}

      {/* Global Structured Data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />

      {/* Social Signals (Open Graph) */}
      <meta property="og:site_name" content="QRCraftly" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      {/*
        TODO: Replace with a dedicated social share image (1200x630px) when available.
        Current fallback is favicon.png to ensure *some* image appears.
      */}
      <meta property="og:image" content={`${DOMAIN}/favicon.png`} />

      {/* Social Signals (Twitter) */}
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:image" content={`${DOMAIN}/favicon.png`} />

      <link rel="icon" type="image/png" href="/favicon.png" />
      <link rel="apple-touch-icon" href="/favicon.png" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

      {/* Preload the font stylesheet */}
      <link
        rel="preload"
        as="style"
        href={fontUrl}
      />

      {/*
        Load the stylesheet asynchronously using the media="print" onload="this.media='all'" pattern.
        We use dangerouslySetInnerHTML on a style tag to inject the link tag without a wrapper div,
        ensuring valid HTML in the head.
      */}
      <style
        dangerouslySetInnerHTML={{
          __html: `</style><link rel="stylesheet" href="${fontUrl}" media="print" onload="this.media='all'" /><style>`
        }}
      />

      <noscript>
        <link href={fontUrl} rel="stylesheet" />
      </noscript>
    </>
  );
}
