import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Define a local mock for QRCanvas that reacts to the isOutOfSync flag from the store using async import
vi.mock('@/components/QRCanvas', async () => {
  const React = await import('react');
  const { useOptionalQRStoreSelector } = await import('@/context/QRContext');
  
  const MockQRCanvas = () => {
    const isOutOfSync = useOptionalQRStoreSelector((state: any) => state.isOutOfSync) ?? false;
    return (
      <div data-testid="qr-canvas-mock" className="relative">
        <canvas data-testid="mock-canvas" />
        {isOutOfSync && (
          <div data-testid="out-of-sync-overlay" className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
            Out of Sync
          </div>
        )}
      </div>
    );
  };
  MockQRCanvas.displayName = 'QRCanvas';
  return { default: MockQRCanvas };
});

import QRTool from '../src/components/QRTool';
import { ToastProvider } from '../src/components/ui/Toast';

describe('Out-of-Sync Canvas Banner and Export Lock Integration Tests', () => {
  let clickInterceptor: (e: MouseEvent) => void;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock canvas context methods
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      roundRect: vi.fn(),
      quadraticCurveTo: vi.fn(),
      beginPath: vi.fn(),
      fill: vi.fn(),
      arc: vi.fn(),
      rect: vi.fn(),
      save: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      drawImage: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      bezierCurveTo: vi.fn(),
      canvas: { width: 0, height: 0 },
      fillStyle: '',
    });

    HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue('data:image/png;base64,mock');

    // Prevent JSDOM from trying to navigate to different router pages in bubbling phase
    clickInterceptor = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'A' || target.closest('a')) {
        e.preventDefault();
      }
    };
    document.addEventListener('click', clickInterceptor);
  });

  afterEach(() => {
    document.removeEventListener('click', clickInterceptor);
  });

  it('displays the "Out of Sync" overlay on the canvas and disables the export buttons when input is invalid', async () => {
    render(
      <ToastProvider>
        <QRTool />
      </ToastProvider>
    );

    // Default tab is URL, which is valid by default.
    // Let's verify the overlay is NOT visible and Download is enabled
    expect(screen.queryByTestId('out-of-sync-overlay')).not.toBeInTheDocument();
    
    const downloadButton = screen.getByRole('button', { name: /download/i });
    expect(downloadButton).not.toBeDisabled();

    // Now, enter an invalid dangerous URL
    const urlInput = screen.getByLabelText('Website URL');
    fireEvent.change(urlInput, { target: { value: 'javascript:alert(1)' } });

    // Let's verify that the "Out of Sync" overlay immediately triggers
    await waitFor(() => {
      expect(screen.getByTestId('out-of-sync-overlay')).toBeInTheDocument();
    });

    // The download button should now be disabled
    expect(downloadButton).toBeDisabled();

    // Copy, Share, and Photos buttons should also be disabled
    const copyButton = screen.getByLabelText(/copy qr code/i);
    expect(copyButton).toBeDisabled();

    const savePhotosButton = screen.getByRole('button', { name: /save.*photos/i });
    expect(savePhotosButton).toBeDisabled();

    // Let's type a valid URL to resolve the error
    fireEvent.change(urlInput, { target: { value: 'https://example.com' } });

    // The overlay should disappear and buttons should unlock
    await waitFor(() => {
      expect(screen.queryByTestId('out-of-sync-overlay')).not.toBeInTheDocument();
    });

    expect(downloadButton).not.toBeDisabled();
    expect(copyButton).not.toBeDisabled();
    expect(savePhotosButton).not.toBeDisabled();
  });

  it('preserves invalid local draft values and handles tab transitions correctly without propagating them to global config', async () => {
    render(
      <ToastProvider>
        <QRTool />
      </ToastProvider>
    );

    // Start on URL tab, type invalid URL to trigger Out of Sync state
    const urlInput = screen.getByLabelText('Website URL');
    fireEvent.change(urlInput, { target: { value: 'javascript:alert(1)' } });

    await waitFor(() => {
      expect(screen.getByTestId('out-of-sync-overlay')).toBeInTheDocument();
    });

    // Navigate away to the Text tab (which is valid by default)
    const textTab = screen.getByRole('tab', { name: 'Text' });
    fireEvent.click(textTab);

    // Navigating to a valid tab should immediately remove the out-of-sync banner and enable export
    await waitFor(() => {
      expect(screen.queryByTestId('out-of-sync-overlay')).not.toBeInTheDocument();
    });
    
    const downloadButton = screen.getByRole('button', { name: /download/i });
    expect(downloadButton).not.toBeDisabled();

    // Navigate back to the URL tab to check if the local typed value was preserved (No Automatic Reversion)
    const urlTab = screen.getByRole('tab', { name: 'URL' });
    fireEvent.click(urlTab);

    await waitFor(() => {
      const urlField = screen.getByLabelText('Website URL');
      expect((urlField as HTMLInputElement).value).toBe('javascript:alert(1)');
      expect(screen.getByTestId('out-of-sync-overlay')).toBeInTheDocument();
    });
  });
});
