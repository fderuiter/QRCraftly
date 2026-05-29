import { ToolContent } from '../data/contentRegistry';

export function generateSchema(content: ToolContent): Record<string, unknown> {
  if (content.id === 'about') {
    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'AboutPage',
          name: content.name,
          url: content.url,
          mainEntity: {
            '@type': 'Organization',
            '@id': 'https://qrcraftly.com/#organization',
            name: 'QRCraftly',
            description: content.description,
            slogan: 'Free. Secure. Open Source.',
            foundingDate: '2025',
          },
        },
        {
          '@type': 'FAQPage',
          mainEntity: content.faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: faq.answer,
            },
          })),
        },
      ],
    };
  }

  const graph: Record<string, unknown>[] = [
    {
      '@type': 'WebApplication',
      name: content.name,
      url: content.url,
      applicationCategory: 'Utilities',
      operatingSystem: 'All',
      softwareVersion: '0.1.0',
      image: 'https://qrcraftly.com/og-image.png',
      datePublished: '2025-01-01',
      author: {
        '@id': 'https://qrcraftly.com/#organization',
      },
      browserRequirements: 'Requires JavaScript. Works in all modern browsers.',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      featureList: content.features.join(', '),
    },
  ];

  if (content.howTo) {
    const howToObj: Record<string, unknown> = {
      '@type': 'HowTo',
      name: content.howTo.name,
      description: content.howTo.description,
      totalTime: 'PT1M',
      estimatedCost: {
        '@type': 'MonetaryAmount',
        currency: 'USD',
        value: '0',
      },
      tool: [
        {
          '@type': 'HowToTool',
          name: `QRCraftly ${content.name.replace(' QR Code Generator', '')} Generator`,
        },
      ],
      step: content.howTo.steps.map((step) => ({
        '@type': 'HowToStep',
        name: step.name,
        text: step.text,
      })),
    };

    if (content.howTo.supply) {
      howToObj.supply = content.howTo.supply.map((s) => ({
        '@type': 'HowToSupply',
        name: s.name,
      }));
    }

    graph.push(howToObj);
  }

  if (content.faqs && content.faqs.length > 0) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: content.faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    });
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}
