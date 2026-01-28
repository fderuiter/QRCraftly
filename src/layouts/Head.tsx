import { usePageContext } from 'vike-react/usePageContext';
import { safeJsonLdStringify } from '@/utils/security';

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
  // Vike-react exposes the resolved config in pageContext.config
  const { config } = pageContext;

  // Helper to resolve potentially functional config values
  const getString = (val: string | ((pageContext: any) => string | null | undefined) | undefined | null, context: any, fallback: string): string => {
    if (!val) return fallback;
    const result = typeof val === 'function' ? val(context) : val;
    return result || fallback;
  };

  const title = getString(config?.title ?? undefined, pageContext, "QRCraftly - Free Custom QR Code Generator");
  const description = getString(config?.description ?? undefined, pageContext, "Generate beautiful, custom QR codes for free. No sign-up required.");

  // Ensure we don't end up with double slashes if urlPathname is just '/'
  let path = pageContext.urlPathname;
  // Normalize path to remove trailing slash for canonical URL
  if (path !== '/' && path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  const canonicalPath = path === '/' ? '' : path;

  // Define domain constant to ensure consistency
  const DOMAIN = "https://qrcraftly.com";
  const canonicalUrl = `${DOMAIN}${canonicalPath}`;

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
        Content Security Policy (CSP)
        - script-src 'unsafe-inline': Required for JSON-LD scripts and Vike hydration in SSG.
        - style-src 'unsafe-inline': Required for the font loading hack and CSS extraction.
        - object-src 'none': Prevents Flash/Java applets.
      */}
      <meta httpEquiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;" />

      {/*
        Note: 'viewport' and 'description' are handled by Vike/Config to avoid duplicates.
        Build output confirmed Vike injects: <meta name="viewport" content="width=device-width,initial-scale=1">

        The 'title' is also injected by Vike based on +config.ts
      */}

      {/* Global Structured Data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(schemaData) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(breadcrumbSchema) }} />

      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />

      {/* Social Signals (Open Graph) */}
      <meta property="og:site_name" content="QRCraftly" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={`${DOMAIN}/og-image.png`} />
      <meta property="og:image:alt" content="QRCraftly QR Code Example" />

      {/* Social Signals (Twitter) */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${DOMAIN}/og-image.png`} />
      <meta name="twitter:image:alt" content="QRCraftly QR Code Example" />

      {/* Mobile & PWA */}
      <meta name="theme-color" content="#0f766e" />
      <link rel="manifest" href="/manifest.json" />
      <link rel="icon" type="image/png" href="/favicon.png" />
      <link rel="apple-touch-icon" href="/favicon.png" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

      {/*
         Load fonts synchronously to prevent Layout Shifts (CLS).
         While async loading improves FCP, the shift when the font swaps
         negatively impacts the user experience and CLS score.
      */}
      {/* Use a raw style tag to inject the link with onload attribute, ensuring it works in SSG */}
      <style dangerouslySetInnerHTML={{ __html: `
        </style>
        <link rel="preload" href="${fontUrl}" as="style" />
        <link rel="stylesheet" href="${fontUrl}" media="print" onload="this.media='all'" />
        <noscript><link rel="stylesheet" href="${fontUrl}" /></noscript>
        <style>`
      }} />
    </>
  );
}
