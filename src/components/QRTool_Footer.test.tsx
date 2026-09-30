
import { ToastProvider } from "./ui/Toast";
import { render, screen, within, fireEvent } from '@testing-library/react';
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

  it('keeps the diagnostics preference in a privacy settings section of the footer, off until chosen', () => {
    render(<ToastProvider><QRTool /></ToastProvider>);

    const footer = screen.getByRole('contentinfo');
    const privacy = within(footer).getByRole('region', { name: /privacy settings/i });

    expect(privacy).toHaveTextContent(/if a scan check fails/i);
    expect(privacy).toHaveTextContent(/QR content and images are never sent/i);
    const toggle = within(privacy).getByRole('switch', { name: /share anonymous diagnostics/i });
    expect(toggle).not.toBeChecked();
    expect(within(privacy).getByTestId('diagnostics-status')).toHaveTextContent(/not chosen yet/i);

    // Nothing about diagnostics lives in the settings column any more.
    const settings = screen.getByRole('complementary', { name: /QR Code Settings/i });
    expect(within(settings).queryByText(/diagnostics/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/we noticed your QR code might be hard to scan/i)).not.toBeInTheDocument();
  });

  it('persists the diagnostics choice when toggled', () => {
    render(<ToastProvider><QRTool /></ToastProvider>);
    const toggle = screen.getByRole('switch', { name: /share anonymous diagnostics/i });
    fireEvent.click(toggle);
    expect(toggle).toBeChecked();
    expect(window.localStorage.getItem('qr-telemetry-opt-in')).toBe('true');
    expect(screen.getByTestId('diagnostics-status')).toHaveTextContent('On');
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
