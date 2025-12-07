import React from 'react';

/**
 * HeadDefault Component
 *
 * Renders the default `<head>` meta tags and link elements for the application.
 * This includes viewport settings, description, favicon, and font preconnections.
 *
 * Optimized to load Google Fonts non-blockingly to improve First Contentful Paint.
 *
 * @returns {JSX.Element} The fragment containing meta and link tags.
 */
export default function HeadDefault() {
  const fontUrl = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap";

  return (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="description" content="Free Custom QR Code Generator" />
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
