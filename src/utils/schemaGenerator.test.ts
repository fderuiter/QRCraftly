import { describe, it, expect } from 'vitest';
import { generateSchema } from './schemaGenerator';
import { ToolContent } from '../data/contentRegistry';

describe('schemaGenerator', () => {
  const dummyContent: ToolContent = {
    id: 'wifi',
    name: 'WiFi QR Code Generator',
    description: 'Generate free wifi qr code',
    url: 'https://qrcraftly.com/wifi',
    features: ['WPA', 'WPA2'],
    howTo: {
      name: 'How to generate Wifi QR Code',
      description: 'Follow these steps',
      steps: [
        { name: 'Enter SSID', text: 'Type your network name' },
      ],
      supply: [
        { name: 'Internet connection' }
      ]
    },
    faqs: [
      { question: 'Is it free?', answer: 'Yes' }
    ]
  };

  const aboutContent: ToolContent = {
    id: 'about',
    name: 'About QRCraftly',
    description: 'We are a secure QR code generator',
    url: 'https://qrcraftly.com/about',
    features: [],
    faqs: [
      { question: 'What is this?', answer: 'An app' }
    ]
  };

  it('generates standard AboutPage schema when id is about', () => {
    const schema = generateSchema(aboutContent);
    expect(schema).toBeDefined();
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@graph'][0]['@type']).toBe('AboutPage');
    expect(schema['@graph'][1]['@type']).toBe('FAQPage');
  });

  it('generates standard WebApplication schema for tool content', () => {
    const schema = generateSchema(dummyContent);
    expect(schema).toBeDefined();
    expect(schema['@context']).toBe('https://schema.org');
    
    // Check WebApplication
    const app = schema['@graph'].find((g: any) => g['@type'] === 'WebApplication');
    expect(app).toBeDefined();
    expect(app.name).toBe(dummyContent.name);
    
    // Check HowTo
    const howTo = schema['@graph'].find((g: any) => g['@type'] === 'HowTo');
    expect(howTo).toBeDefined();
    expect(howTo.supply).toBeDefined();
    expect(howTo.supply[0].name).toBe('Internet connection');

    // Check FAQPage
    const faq = schema['@graph'].find((g: any) => g['@type'] === 'FAQPage');
    expect(faq).toBeDefined();
  });

  it('handles optional parameters resolvedDomain and requestPath', () => {
    const schema = generateSchema(dummyContent, 'https://test.domain.com', '/request-path');
    const app = schema['@graph'].find((g: any) => g['@type'] === 'WebApplication');
    expect(app.url).toContain('/request-path');
    expect(app.image).toBe('https://test.domain.com/og-image.png');
  });

  it('handles howTo without supply or faq list', () => {
    const contentNoSupply: ToolContent = {
      ...dummyContent,
      howTo: {
        name: 'Steps',
        description: 'Do it',
        steps: [{ name: 'Step 1', text: 'Press button' }]
        // supply is undefined
      },
      faqs: undefined
    };
    const schema = generateSchema(contentNoSupply);
    const howTo = schema['@graph'].find((g: any) => g['@type'] === 'HowTo');
    expect(howTo).toBeDefined();
    expect(howTo.supply).toBeUndefined();

    const faq = schema['@graph'].find((g: any) => g['@type'] === 'FAQPage');
    expect(faq).toBeUndefined();
  });

  it('handles about page schema without faqs', () => {
    const aboutNoFaqs = { ...aboutContent, faqs: undefined };
    const schema = generateSchema(aboutNoFaqs);
    expect(schema['@graph'][1]['mainEntity']).toEqual([]);
  });

  it('handles tool content without howTo', () => {
    const noHowTo: ToolContent = {
      ...dummyContent,
      howTo: undefined,
    };
    const schema = generateSchema(noHowTo);
    const howTo = schema['@graph'].find((g: any) => g['@type'] === 'HowTo');
    expect(howTo).toBeUndefined();
  });

  it('does NOT generate specialized schemas for event, location, meeting, and social tool IDs but retains WebApplication', () => {
    const eventContent: ToolContent = {
      id: 'event-qr-code',
      name: 'Event QR',
      description: 'Generate Event QR',
      url: 'https://qrcraftly.com/event-qr-code',
      features: []
    };
    const eventSchema = generateSchema(eventContent);
    const eventObj = eventSchema['@graph'].find((g: any) => g['@type'] === 'Event');
    const placeObjInEvent = eventSchema['@graph'].find((g: any) => g['@type'] === 'Place');
    expect(eventObj).toBeUndefined();
    expect(placeObjInEvent).toBeUndefined();
    const eventApp = eventSchema['@graph'].find((g: any) => g['@type'] === 'WebApplication');
    expect(eventApp).toBeDefined();

    const locationContent: ToolContent = {
      id: 'location-qr-code',
      name: 'Location QR',
      description: 'Generate Location QR',
      url: 'https://qrcraftly.com/location-qr-code',
      features: []
    };
    const locationSchema = generateSchema(locationContent);
    const locationObj = locationSchema['@graph'].find((g: any) => g['@type'] === 'Place');
    expect(locationObj).toBeUndefined();
    const locationApp = locationSchema['@graph'].find((g: any) => g['@type'] === 'WebApplication');
    expect(locationApp).toBeDefined();

    const meetingContent: ToolContent = {
      id: 'meeting-qr-code',
      name: 'Meeting QR',
      description: 'Generate Meeting QR',
      url: 'https://qrcraftly.com/meeting-qr-code',
      features: []
    };
    const meetingSchema = generateSchema(meetingContent);
    const meetingObj = meetingSchema['@graph'].find((g: any) => g['@type'] === 'Event');
    expect(meetingObj).toBeUndefined();
    const meetingApp = meetingSchema['@graph'].find((g: any) => g['@type'] === 'WebApplication');
    expect(meetingApp).toBeDefined();

    const socialContent: ToolContent = {
      id: 'social-qr-code',
      name: 'Social QR',
      description: 'Generate Social QR',
      url: 'https://qrcraftly.com/social-qr-code',
      features: []
    };
    const socialSchema = generateSchema(socialContent);
    const socialObj = socialSchema['@graph'].find((g: any) => g['@type'] === 'ProfilePage');
    expect(socialObj).toBeUndefined();
    const socialApp = socialSchema['@graph'].find((g: any) => g['@type'] === 'WebApplication');
    expect(socialApp).toBeDefined();
  });
});
