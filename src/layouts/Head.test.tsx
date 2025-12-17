
import { render, screen } from '@testing-library/react';
import React from 'react';
import HeadDefault from './Head';
import { vi } from 'vitest';

// Mock usePageContext
const mockPageContext = {
  urlPathname: '/',
  config: {
    title: 'Test Title',
    description: 'Test Description'
  }
};

vi.mock('vike-react/usePageContext', () => ({
  usePageContext: () => mockPageContext
}));

describe('HeadDefault', () => {
  it('renders social meta tags correctly', () => {
    const { container } = render(<HeadDefault />);

    // Debug output
    // console.log("Container HTML:", container.innerHTML);
    // console.log("Head HTML:", document.head.innerHTML);
    // console.log("Body HTML:", document.body.innerHTML);

    // Check if they ended up in head (unlikely with just render) or body
    // Note: React Testing Library renders into a div in document.body.

    // Let's search in the whole document
    const getMeta = (attr: string, value: string) =>
      document.querySelector(`meta[${attr}="${value}"]`) || container.querySelector(`meta[${attr}="${value}"]`);

    // Check Open Graph
    const ogTitle = getMeta('property', 'og:title');
    // console.log("og:title found?", ogTitle?.outerHTML);

    expect(ogTitle).not.toBeNull();
    expect(ogTitle).toHaveAttribute('content', 'Test Title');

    const ogDesc = getMeta('property', 'og:description');
    expect(ogDesc).not.toBeNull();
    expect(ogDesc).toHaveAttribute('content', 'Test Description');

    // Check Twitter
    const twTitle = getMeta('name', 'twitter:title');
    expect(twTitle).not.toBeNull();
    expect(twTitle).toHaveAttribute('content', 'Test Title');
  });
});
