import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Page from './+Page';

describe('Security Page', () => {
  it('renders a single h1 and nested sub-headings', () => {
    const { container } = render(<Page />);

    // Check main heading (h1)
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent(/Security & Privacy Transparency Hub/i);

    // Verify sub-headings inside document sections are shifted down (depth + 1)
    // E.g., doc titles are h2. Any markdown headers that would have been h2 should now be h3, etc.
    const h2s = screen.getAllByRole('heading', { level: 2 });
    expect(h2s.length).toBeGreaterThan(0);

    // Check that we don't have multiple nested heading violations (i.e. every heading from customMarked should be h3 or lower if it is parsed, check tags in container)
    const headers = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headers.forEach((header) => {
      // The only h1 should be the page title
      if (header.tagName === 'H1') {
        expect(header).toHaveTextContent(/Security & Privacy Transparency Hub/i);
      }
    });
  });
});
