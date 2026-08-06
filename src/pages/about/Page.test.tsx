/*
    QRCraftly
    Copyright (C) 2025 fderuiter

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Page from './+Page';
import { coreValues } from '@/data/coreValues';
import { contentRegistry } from '@/data/contentRegistry';

describe('About Page', () => {
  it('renders the About page content', () => {
    render(<Page />);

    // Check main heading
    expect(screen.getByRole('heading', { level: 1, name: /About QRCraftly/i })).toBeInTheDocument();

    // Check existing content
    expect(screen.getByText(/Privacy-focused QR code generator/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Free & No Login/i })).toBeInTheDocument();
  });

  it('renders exactly four value cards driven entirely by the core values registry', () => {
    render(<Page />);

    // Assert there are exactly 4 core value cards from the registry
    expect(coreValues.length).toBe(4);

    coreValues.forEach((value) => {
      // Each value card title should render as an h3 heading
      expect(screen.getByRole('heading', { level: 3, name: value.title })).toBeInTheDocument();
      // Description should be in the document
      expect(screen.getByText(value.description)).toBeInTheDocument();
    });
  });

  it('populates the "about" tool entry FAQ from the core values dataset', () => {
    const aboutTool = contentRegistry['about'];
    expect(aboutTool.faqs).toBeDefined();
    expect(aboutTool.faqs?.length).toBe(coreValues.length);

    coreValues.forEach((value, index) => {
      const faq = aboutTool.faqs?.[index];
      expect(faq?.question).toBe(value.faqQuestion);
      expect(faq?.answer).toBe(value.description);
    });
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
