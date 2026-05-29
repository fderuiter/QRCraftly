import { ToastProvider } from './ui/Toast';
import { render, screen, within } from '@testing-library/react';
import QRTool from './QRTool';
import { describe, it, expect, vi } from 'vitest';

// Mock QRCanvas as we don't need its functionality here
vi.mock('./QRCanvas', () => ({
  default: () => <div data-testid="qr-canvas-mock" />,
}));

describe('QRTool Footer', () => {
  it('renders a semantic footer with navigation links', () => {
    render(
      <ToastProvider>
        <QRTool />
      </ToastProvider>,
    );

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
    render(
      <ToastProvider>
        <QRTool />
      </ToastProvider>,
    );
    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveTextContent(/QRCraftly/i);
    expect(footer).toHaveTextContent(/Open Source/i);
  });
});
