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
    expect(screen.getByRole('navigation', { name: /Primary navigation/i })).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();

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

  it('appends unique, document-prefixed ID attributes to heading elements and rewrites cross-file links', () => {
    const { container } = render(<Page />);

    // Check heading ID for HIPAA Compliance Alignment in compliance document
    const complianceHeading = container.querySelector('#compliance-hipaa-compliance-alignment');
    expect(complianceHeading).not.toBeNull();
    expect(complianceHeading?.tagName).toBe('H3');
    expect(complianceHeading?.textContent).toBe('HIPAA Compliance Alignment');

    // Check heading ID for CI/CD Security Governance in security document
    const securityHeading = container.querySelector('#security-cicd-security-governance');
    expect(securityHeading).not.toBeNull();
    expect(securityHeading?.tagName).toBe('H3');
    expect(securityHeading?.textContent).toContain('CI/CD Security Governance');

    // Check link in security section pointing to COMPLIANCE.md is rewritten to #compliance
    const complianceLink = container.querySelector('a[href="#compliance"]');
    expect(complianceLink).not.toBeNull();
    expect(complianceLink?.textContent).toBe('COMPLIANCE.md');
  });
});
