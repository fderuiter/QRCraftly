import { ToolContent } from '../data/contentRegistry';
import { resolveDomainForPath, resolvePublicUrl } from './metadataEngine';

export function generateSchema(content: ToolContent, resolvedDomain?: string, requestPath?: string): any {
  const domain = resolvedDomain || resolveDomainForPath(content.url);
  const publicUrl = requestPath ? resolvePublicUrl(requestPath) : content.url;
  
  if (content.id === 'about') {
    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "AboutPage",
          "name": content.name,
          "url": publicUrl,
          "mainEntity": {
            "@type": "Organization",
            "@id": `${domain}/#organization`,
            "name": "QRCraftly",
            "description": content.description,
            "slogan": "Free. Secure. Open Source.",
            "foundingDate": "2025"
          }
        },
        {
          "@type": "FAQPage",
          "mainEntity": (content.faqs || []).map(faq => ({
            "@type": "Question",
            "name": faq.question,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": faq.answer
            }
          }))
        }
      ]
    };
  }

  const graph: any[] = [
    {
      "@type": "WebApplication",
      "name": content.name,
      "url": publicUrl,
      "applicationCategory": "Utilities",
      "operatingSystem": "All",
      "softwareVersion": "0.1.0",
      "image": `${domain}/og-image.png`,
      "datePublished": "2025-01-01",
      "author": {
        "@id": `${domain}/#organization`
      },
      "browserRequirements": "Requires JavaScript. Works in all modern browsers.",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "featureList": content.features.join(", ")
    }
  ];

  if (content.howTo) {
    const howToObj: any = {
      "@type": "HowTo",
      "name": content.howTo.name,
      "description": content.howTo.description,
      "totalTime": "PT1M",
      "estimatedCost": {
        "@type": "MonetaryAmount",
        "currency": "USD",
        "value": "0"
      },
      "tool": [
        {
          "@type": "HowToTool",
          "name": `QRCraftly ${content.name.replace(' QR Code Generator', '')} Generator`
        }
      ],
      "step": content.howTo.steps.map(step => ({
        "@type": "HowToStep",
        "name": step.name,
        "text": step.text
      }))
    };

    if (content.howTo.supply) {
      howToObj.supply = content.howTo.supply.map(s => ({
        "@type": "HowToSupply",
        "name": s.name
      }));
    }

    graph.push(howToObj);
  }

  if (content.faqs && content.faqs.length > 0) {
    graph.push({
      "@type": "FAQPage",
      "mainEntity": content.faqs.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer
        }
      }))
    });
  }

  if (content.id === 'event-qr-code') {
    graph.push({
      "@type": "Event",
      "name": "Custom Calendar Event",
      "description": "Add this custom event to your calendar. Generated with QRCraftly.",
      "startDate": "2026-08-05T12:00:00Z",
      "endDate": "2026-08-05T13:00:00Z",
      "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
      "eventStatus": "https://schema.org/EventScheduled",
      "location": {
        "@type": "Place",
        "name": "Your Event Location",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "123 Event Street",
          "addressLocality": "City",
          "addressRegion": "State",
          "postalCode": "12345",
          "addressCountry": "US"
        }
      },
      "organizer": {
        "@type": "Organization",
        "name": "QRCraftly",
        "url": domain
      }
    });
  } else if (content.id === 'location-qr-code') {
    graph.push({
      "@type": "Place",
      "name": "Shared Coordinates",
      "description": "Geographical location coordinates shared via QRCraftly QR Code.",
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": "37.7749",
        "longitude": "-122.4194"
      },
      "hasMap": "https://maps.google.com/?q=37.7749,-122.4194"
    });
  } else if (content.id === 'meeting-qr-code') {
    graph.push({
      "@type": "Event",
      "name": "Virtual Meeting Room",
      "description": "Join the virtual meeting using the join link. Generated with QRCraftly.",
      "startDate": "2026-08-05T12:00:00Z",
      "endDate": "2026-08-05T13:00:00Z",
      "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode",
      "eventStatus": "https://schema.org/EventScheduled",
      "location": {
        "@type": "VirtualLocation",
        "url": publicUrl
      },
      "organizer": {
        "@type": "Organization",
        "name": "QRCraftly",
        "url": domain
      }
    });
  } else if (content.id === 'social-qr-code') {
    graph.push({
      "@type": "ProfilePage",
      "name": "Social Media Hub",
      "description": "Connect with social profiles shared via QRCraftly QR Code.",
      "url": publicUrl,
      "mainEntity": {
        "@type": "Person",
        "name": "QRCraftly User",
        "sameAs": [
          "https://instagram.com",
          "https://twitter.com",
          "https://tiktok.com"
        ]
      }
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph
  };
}
