import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SidebarContent, getAboutHeading } from './SidebarContent';

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
