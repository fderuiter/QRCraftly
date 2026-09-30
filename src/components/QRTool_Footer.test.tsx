
import { ToastProvider } from "./ui/Toast";
import { render, screen, within } from '@testing-library/react';
import QRTool from './QRTool';
import { beforeEach, describe, it, expect, vi } from 'vitest';

// Mock QRCanvas as we don't need its functionality here
vi.mock('./QRCanvas', () => ({
  default: () => <div data-testid="qr-canvas-mock" />
}));

describe('QRTool Footer', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders a semantic footer with navigation links', () => {
    render(<ToastProvider><QRTool /></ToastProvider>);

    // Check for footer role
    const footer = screen.getByRole('contentinfo');
    expect(footer).toBeInTheDocument();

    // Check for semantic navigation within footer
    const nav = within(footer).getByRole('navigation');
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveAttribute('aria-label', 'Site Map');

    // Check for specific links
    const homeLink = within(nav).getByRole('link', { name: /url qr code/i });
    expect(homeLink).toHaveAttribute('href', '/');

    const wifiLink = within(nav).getByRole('link', { name: /wifi qr code/i });
    expect(wifiLink).toHaveAttribute('href', '/wifi-qr-code');

    const aboutLink = within(nav).getByRole('link', { name: /about/i });
    expect(aboutLink).toHaveAttribute('href', '/about');
  });

  it('renders copyright information', () => {
    render(<ToastProvider><QRTool /></ToastProvider>);
    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveTextContent(/QRCraftly/i);
    expect(footer).toHaveTextContent(/Open Source/i);
  });

  it('asks for no diagnostics consent and sends no reports', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(<ToastProvider><QRTool /></ToastProvider>);

    expect(screen.queryByRole('region', { name: /anonymous diagnostics|privacy settings/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: /diagnostics/i })).not.toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('links the no-ads pledge and has no donation links', () => {
    render(<ToastProvider><QRTool /></ToastProvider>);
    const footer = screen.getByRole('contentinfo');

    const pledgeLinks = within(footer).getAllByRole('link', { name: /pledge|no ads/i });
    expect(pledgeLinks.length).toBeGreaterThan(0);
    for (const link of pledgeLinks) {
      expect(link).toHaveAttribute('href', '/free-forever');
    }
    expect(footer.innerHTML).not.toMatch(/ko-fi/i);
  });

  it('links to real anchors on the security page', () => {
    render(<ToastProvider><QRTool /></ToastProvider>);
    const nav = screen.getByRole('navigation', { name: 'Site Map' });
    expect(within(nav).getByRole('link', { name: 'Security Policy' })).toHaveAttribute('href', '/security#security');
    expect(within(nav).getByRole('link', { name: 'Privacy Architecture' })).toHaveAttribute('href', '/security#compliance');
    // Send and Receive are each listed exactly once.
    expect(within(nav).getAllByRole('link', { name: /File Share \(Send\)/ })).toHaveLength(1);
    expect(within(nav).getAllByRole('link', { name: /File Share \(Receive\)/ })).toHaveLength(1);
  });
});
