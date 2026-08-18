import { ToolContent, AuxiliaryContent, getContentForPath, getContentById } from '../data/contentRegistry';
import { resolveDomainForPath, resolvePublicUrl } from './metadataEngine';

/**
 * Dynamically generates structured schema.org JSON-LD graph data directly from central content registry.
 * Eliminates static route config import maps.
 *
 * @param contentOrPath The registry content object or route path / tool ID string.
 * @param resolvedDomain Optional domain string override.
 * @param requestPath Optional request path string override.
 * @returns Structured JSON-LD schema graph.
 */
export function generateSchema(
  contentOrPath: ToolContent | AuxiliaryContent | string,
  resolvedDomain?: string,
  requestPath?: string
): any {
  let content: ToolContent | AuxiliaryContent | undefined;

  if (typeof contentOrPath === 'string') {
    content = getContentForPath(contentOrPath) || getContentById(contentOrPath);
  } else {
    content = contentOrPath;
  }

  if (!content) {
    return {
      "@context": "https://schema.org",
      "@graph": []
    };
  }

  const contentUrl = (content as ToolContent).url || (requestPath ? resolvePublicUrl(requestPath) : '');
  const domain = resolvedDomain || resolveDomainForPath(contentUrl || (requestPath ? resolvePublicUrl(requestPath) : ''));
  const publicUrl = requestPath ? resolvePublicUrl(requestPath) : (contentUrl || `${domain}/${content.id}`);

  if (content.id === 'about') {
    const aboutGraph: any[] = [
      {
        "@type": "AboutPage",
        "name": content.name,
        "description": content.description,
        "url": publicUrl,
        "mainEntity": {
          "@id": `${domain}/#organization`
        }
      }
    ];

    const faqs = (content as ToolContent).faqs;
    if (faqs && faqs.length > 0) {
      aboutGraph.push({
        "@type": "FAQPage",
        "mainEntity": faqs.map(faq => ({
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

  const toolContent = content as ToolContent;
  const typeValue = toolContent.schemaType || "WebApplication";
  const categoryValue = toolContent.schemaCategory || "UtilitiesApplication";

  const featureList = [toolContent.valueProposition, ...(toolContent.features || [])].filter(Boolean).join(", ");

  const appEntity: any = {
    "@type": typeValue,
    "name": content.name,
    "description": content.description,
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
    "featureList": featureList
  };

  if (content.personas && content.personas.length > 0) {
    appEntity.audience = content.personas.map(persona => ({
      "@type": "Audience",
      "audienceType": persona
    }));
  }

  const graph: any[] = [appEntity];

  if (toolContent.howTo) {
    let extension = 'png';
    const imagePath = content.image || content.ogImage;
    if (typeof imagePath === 'string') {
      const withoutQuery = imagePath.split('?')[0];
      const dotIndex = withoutQuery.lastIndexOf('.');
      if (dotIndex !== -1) {
        extension = withoutQuery.slice(dotIndex + 1);
      }
    }
    const imageUrl = `${domain}/assets/images/completed/${content.id}.${extension}`;

    const howToObj: any = {
      "@type": "HowTo",
      "name": toolContent.howTo.name,
      "description": toolContent.howTo.description,
      "image": imageUrl,
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
      "step": toolContent.howTo.steps.map(step => ({
        "@type": "HowToStep",
        "name": step.name,
        "text": step.text
      }))
    };

    if (toolContent.howTo.supply) {
      howToObj.supply = toolContent.howTo.supply.map(s => ({
        "@type": "HowToSupply",
        "name": s.name
      }));
    }

    graph.push(howToObj);
  }

  if (toolContent.faqs && toolContent.faqs.length > 0) {
    graph.push({
      "@type": "FAQPage",
      "mainEntity": toolContent.faqs.map(faq => ({
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
