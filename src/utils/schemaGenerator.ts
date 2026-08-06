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



  return {
    "@context": "https://schema.org",
    "@graph": graph
  };
}
