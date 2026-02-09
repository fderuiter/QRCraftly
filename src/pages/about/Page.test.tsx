import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Page from './+Page';

describe('About Page', () => {
  it('renders the About page content', () => {
    render(<Page />);

    // Check main heading
    expect(screen.getByRole('heading', { name: /About QRCraftly/i })).toBeInTheDocument();

    // Check existing content
    expect(screen.getByText(/Privacy-focused QR code generator/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Free & No Login/i })).toBeInTheDocument();
  });

  it('contains a link to the WiFi QR Code generator for better SEO discovery', () => {
    render(<Page />);

    // Check for the new section heading
    expect(screen.getByRole('heading', { name: /Specialized Generators/i })).toBeInTheDocument();

    // Check for the descriptive text
    expect(screen.getByText(/Looking for a specific use case/i)).toBeInTheDocument();

    // Check for the internal link
    const wifiLink = screen.getByRole('link', { name: /Create WiFi QR Code/i });
    expect(wifiLink).toBeInTheDocument();
    expect(wifiLink).toHaveAttribute('href', '/wifi-qr-code');
  });
});
