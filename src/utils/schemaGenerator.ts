import { ToolContent } from '../data/contentRegistry';
import { resolveDomainForPath, resolvePublicUrl } from './metadataEngine';

import aboutConfig from '../pages/about/+config';
import audioConfig from '../pages/audio-qr/+config';
import destroyTheQrConfig from '../pages/destroy-the-qr/+config';
import emailConfig from '../pages/email-qr-code/+config';
import eventConfig from '../pages/event-qr-code/+config';
import fileTransferConfig from '../pages/file-transfer/+config';
import gameConfig from '../pages/game/+config';
import indexConfig from '../pages/index/+config';
import locationConfig from '../pages/location-qr-code/+config';
import meetingConfig from '../pages/meeting-qr-code/+config';
import paymentConfig from '../pages/payment-qr-code/+config';
import phoneConfig from '../pages/phone-qr-code/+config';
import securityConfig from '../pages/security/+config';
import smsConfig from '../pages/sms-qr-code/+config';
import socialConfig from '../pages/social-qr-code/+config';
import textConfig from '../pages/text-qr-code/+config';
import vcardConfig from '../pages/vcard-qr-code/+config';
import wifiConfig from '../pages/wifi-qr-code/+config';

const configMap: Record<string, any> = {
  'about': aboutConfig,
  'audio-qr': audioConfig,
  'destroy-the-qr': destroyTheQrConfig,
  'email-qr-code': emailConfig,
  'event-qr-code': eventConfig,
  'file-transfer': fileTransferConfig,
  'game': gameConfig,
  'index': indexConfig,
  'location-qr-code': locationConfig,
  'meeting-qr-code': meetingConfig,
  'payment-qr-code': paymentConfig,
  'phone-qr-code': phoneConfig,
  'security': securityConfig,
  'sms-qr-code': smsConfig,
  'social-qr-code': socialConfig,
  'text-qr-code': textConfig,
  'vcard-qr-code': vcardConfig,
  'wifi-qr-code': wifiConfig,
};

export function generateSchema(content: ToolContent, resolvedDomain?: string, requestPath?: string): any {
  const domain = resolvedDomain || resolveDomainForPath(content.url);
  const publicUrl = requestPath ? resolvePublicUrl(requestPath) : content.url;
  
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
    "featureList": [content.valueProposition, ...content.features].filter(Boolean).join(", ")
  };

  if (content.personas && content.personas.length > 0) {
    appEntity.audience = content.personas.map(persona => ({
      "@type": "Audience",
      "audienceType": persona
    }));
  }

  const graph: any[] = [appEntity];

  if (content.howTo) {
    const pageConfig = configMap[content.id];
    let extension = 'png';
    const imagePath = pageConfig?.image;
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
      "name": content.howTo.name,
      "description": content.howTo.description,
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
