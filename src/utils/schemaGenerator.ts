import { ToolContent } from '../data/contentRegistry';
import { resolveDomainForPath, resolvePublicUrl } from './metadataEngine';

export function generateSchema(content: ToolContent, resolvedDomain?: string, requestPath?: string): any {
  const domain = resolvedDomain || resolveDomainForPath(content.url);
  const publicUrl = requestPath ? resolvePublicUrl(requestPath) : content.url;
  
  if (content.id === 'about') {
    const aboutGraph: any[] = [
      {
        "@type": "AboutPage",
        "name": content.name,
        "url": publicUrl,
        "mainEntity": {
          "@id": `${domain}/#organization`
        }
      }
    ];

    if (content.faqs && content.faqs.length > 0) {
      aboutGraph.push({
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

    if (content.personas && content.personas.length > 0) {
      aboutGraph[0].audience = content.personas.map(persona => ({
        "@type": "Audience",
        "audienceType": persona
      }));
    }

    return {
      "@context": "https://schema.org",
      "@graph": aboutGraph
    };
  }

  const typeValue = content.schemaType;
  const categoryValue = content.schemaCategory;

  const appEntity: any = {
    "@type": typeValue,
    "name": content.name,
    "url": publicUrl,
    "applicationCategory": categoryValue,
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
  };

  if (content.personas && content.personas.length > 0) {
    appEntity.audience = content.personas.map(persona => ({
      "@type": "Audience",
      "audienceType": persona
    }));
  }

  const graph: any[] = [appEntity];

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
