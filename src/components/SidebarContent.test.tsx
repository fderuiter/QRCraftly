import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SidebarContent, getAboutHeading } from './SidebarContent';
import { contentRegistry } from '@/data/contentRegistry';

describe('getAboutHeading', () => {
  it('does not prefix names that already begin with "About"', () => {
    expect(getAboutHeading('About QRCraftly')).toBe('About QRCraftly');
    expect(getAboutHeading('about us')).toBe('about us');
  });

  it('prefixes other names', () => {
    expect(getAboutHeading('WiFi QR Code')).toBe('About WiFi QR Code');
    expect(getAboutHeading('Aboutique')).toBe('About Aboutique');
  });
});

describe('SidebarContent', () => {
  it('never renders an "About About" heading for a registry entry named "About ..."', () => {
    render(<SidebarContent toolId="about" />);
    expect(screen.queryByRole('heading', { name: /About About/i })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'About QRCraftly' })).toBeInTheDocument();
  });

  it('keeps the "About" prefix for tool entries', () => {
    render(<SidebarContent toolId="wifi-qr-code" />);
    expect(screen.getByRole('heading', { level: 2, name: /^About WiFi/ })).toBeInTheDocument();
  });
});

describe('SidebarContent FAQs and intro', () => {
  const generatorIds = [
    'index', 'wifi-qr-code', 'vcard-qr-code', 'email-qr-code', 'sms-qr-code', 'phone-qr-code',
    'event-qr-code', 'location-qr-code', 'meeting-qr-code', 'payment-qr-code', 'social-qr-code', 'text-qr-code',
  ];

  it.each(generatorIds)('renders its own FAQ answers as text for %s, even while collapsed', (toolId) => {
    const faqs = contentRegistry[toolId].faqs ?? [];
    expect(faqs.length).toBeGreaterThanOrEqual(4);
    const { container } = render(<SidebarContent toolId={toolId} />);
    // Answers must be in the rendered HTML so crawlers that do not run JS can read them.
    for (const faq of faqs) {
      expect(container.textContent).toContain(faq.answer);
    }
  });

  it('gives each generator page questions of its own', () => {
    const indexQuestions = new Set((contentRegistry['index'].faqs ?? []).map((f) => f.question));
    for (const toolId of generatorIds.filter((id) => id !== 'index')) {
      const own = (contentRegistry[toolId].faqs ?? []).filter((f) => !indexQuestions.has(f.question));
      expect(own.length, toolId).toBeGreaterThanOrEqual(2);
    }
  });

  it('shows the homepage intro with a link to the pledge', () => {
    render(<SidebarContent toolId="index" />);
    expect(screen.getByText(contentRegistry['index'].intro ?? '')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Read the no-ads pledge' })).toHaveAttribute('href', '/free-forever');
  });
});

describe('SidebarContent internal linking (#1031)', () => {
  it('shows breadcrumbs, an example picture with alt text and related generator pages', () => {
    render(<SidebarContent toolId="wifi-qr-code" />);
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    const example = screen.getByRole('img', { name: /Example of a QR code made with the WiFi QR Code Generator/ });
    expect(example).toHaveAttribute('src', '/examples/wifi-qr-code.svg');
    const related = screen.getByRole('heading', { level: 2, name: 'More QR code types' }).parentElement as HTMLElement;
    expect(related.querySelectorAll('a')).toHaveLength(4);
  });

  it('leaves the example and related list off pages that are not generators', () => {
    render(<SidebarContent toolId="security" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'More QR code types' })).not.toBeInTheDocument();
  });
});
