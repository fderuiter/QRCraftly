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

import { usePageContext } from 'vike-react/usePageContext';
import { JsonLdScript } from '@/components/ui/JsonLdScript';
import { resolveDomainForPath, resolvePublicUrl, resolveImageUrl, compileBreadcrumbSchema } from '@/utils/metadataEngine';

/**
 * HeadDefault Component
 *
 * Renders the default `<head>` meta tags and link elements for the application.
 * This includes viewport settings, description, favicon, font preconnections,
 * and global structured data (JSON-LD) for SEO.
 *
 * Optimized to load Google Fonts non-blockingly to improve First Contentful Paint.
 * @returns The fragment containing meta and link tags.
 */
export default function HeadDefault() {
  const fontUrl = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap";

  const pageContext = usePageContext();
  // Vike-react exposes the resolved config in pageContext.config
  // Cast to any to access is404 which might not be in the default type definition
  const { config, is404 } = pageContext as any;

  // Helper to resolve potentially functional config values
  const getString = (val: string | ((pageContext: any) => string | null | undefined) | undefined | null, context: any, fallback: string): string => {
    if (!val) return fallback;
    const result = typeof val === 'function' ? val(context) : val;
    return result || fallback;
  };

  const title = getString(config?.title ?? undefined, pageContext, "QRCraftly - Free Custom QR Code Generator");
  const description = getString(config?.description ?? undefined, pageContext, "Generate beautiful, custom QR codes for free. No sign-up required.");

  const resolvedDomain = resolveDomainForPath(pageContext.urlPathname);
  const canonicalUrl = resolvePublicUrl(pageContext.urlPathname);

  // Resolve Open Graph Image
  // Allows pages to override the default OG image via config.image
  const imageConfig = config?.image;
  const imageUrl = resolveImageUrl(imageConfig, pageContext.urlPathname);

  const imageAlt = config?.imageAlt || "QRCraftly QR Code Example";

  const schemaData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${resolvedDomain}/#organization`,
        "name": "QRCraftly",
        "url": resolvedDomain,
        "logo": `${resolvedDomain}/favicon.png`,
        "description": "Privacy-focused, client-side QR code generator.",
        "slogan": "Free. Secure. Open Source.",
        "foundingDate": "2025",
        "sameAs": [
          "https://github.com/fderuiter/QRCraftly"
        ]
      },
      {
        "@type": "WebSite",
        "name": "QRCraftly",
        "url": resolvedDomain,
        "description": "Free, secure, and client-side QR code generator with privacy-first architecture.",
        "publisher": {
          "@id": `${resolvedDomain}/#organization`
        }
      }
    ]
  };

  const breadcrumbSchema = compileBreadcrumbSchema(pageContext.urlPathname);

  return (
    <>
      {/*
        Content Security Policy (CSP)
        - script-src 'unsafe-inline': Required for JSON-LD scripts and Vike hydration in SSG.
        - style-src: Removed 'unsafe-inline' by refactoring font loading and dynamic preview styles.
        - object-src 'none': Prevents Flash/Java applets.
      */}
      <meta httpEquiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self';" />

      {/*
        Note: 'viewport' and 'description' are handled by Vike/Config to avoid duplicates.
        Build output confirmed Vike injects: <meta name="viewport" content="width=device-width,initial-scale=1">

        The 'title' is also injected by Vike based on +config.ts
      */}

      {/* Global Structured Data */}
      <JsonLdScript data={schemaData} />
      {!is404 && breadcrumbSchema && <JsonLdScript data={breadcrumbSchema} />}

      {/* Canonical URL - Do not render for 404 pages to avoid indexing errors */}
      {!is404 && <link rel="canonical" href={canonicalUrl} />}

      {/* Robots Meta for 404 */}
      {is404 && <meta name="robots" content="noindex, nofollow" />}

      {/* Social Signals (Open Graph) */}
      <meta property="og:site_name" content="QRCraftly" />
      <meta property="og:type" content="website" />
      {!is404 && <meta property="og:url" content={canonicalUrl} />}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:image:width" content="1280" />
      <meta property="og:image:height" content="720" />
      <meta property="og:image:alt" content={imageAlt} />

      {/* Social Signals (Twitter) */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:image:alt" content={imageAlt} />

      {/* Mobile & PWA */}
      <meta name="theme-color" content="#0f766e" />
      <link rel="manifest" href="/manifest.json" />
      <link rel="icon" type="image/png" href="/favicon.png" />
      <link rel="apple-touch-icon" href="/favicon.png" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

      {/*
         Load fonts synchronously to prevent Layout Shifts (CLS).
         Standard link tag is render-blocking which ensures fonts are ready
         before first paint, avoiding layout shifts.
      */}
      <link rel="stylesheet" href={fontUrl} />
    </>
  );
}
