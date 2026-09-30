import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import RedirectResolverPage from './+Page';
import { encryptUrl, generateDecryptionKey } from '@/packages/edge-redirect/client';

let mockRouteParams: { id?: string } = { id: 'test-link-123' };

vi.mock('vike-react/usePageContext', () => ({
  usePageContext: () => ({
    routeParams: mockRouteParams,
  }),
}));

describe('RedirectResolverPage', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  const originalLocation = window.location;

  beforeEach(() => {
    mockRouteParams = { id: 'test-link-123' };
    fetchSpy = vi.fn();
    global.fetch = fetchSpy as any;

    // Mock window.location
    delete (window as any).location;
    (window as any).location = {
      ...originalLocation,
      hash: '',
      replace: vi.fn(),
      origin: 'http://localhost:3000',
    };
  });

  afterEach(() => {
    (window as any).location = originalLocation;
    vi.restoreAllMocks();
  });

  it('displays error when URL anchor hash fragment is missing or invalid', async () => {
    window.location.hash = '';

    render(<RedirectResolverPage />);

    await waitFor(() => {
      expect(screen.getByText(/Link Resolution Error/i)).toBeInTheDocument();
      expect(screen.getByText(/Decryption key is missing or invalid in URL fragment/i)).toBeInTheDocument();
    });
  });

  it('fetches payload, decrypts target URL locally using key in hash, and navigates', async () => {
    const keyHex = await generateDecryptionKey();
    const targetUrl = 'https://destination.com/my-target-page';
    const ciphertext = await encryptUrl(targetUrl, keyHex);

    window.location.hash = `#key=${keyHex}`;

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'test-link-123',
        redirectUrl: ciphertext,
      }),
    });

    render(<RedirectResolverPage />);

    expect(screen.getByText(/Decrypting Zero-Knowledge Dynamic Link/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('/api/redirect/test-link-123', {
        headers: { 'Accept': 'application/json' },
      });
      expect(window.location.replace).toHaveBeenCalledWith('https://destination.com/my-target-page');
    });
  });

  it('blocks navigation and displays security alert if decrypted target URL is dangerous', async () => {
    const keyHex = await generateDecryptionKey();
    const dangerousUrl = 'javascript:alert(1)';
    const ciphertext = await encryptUrl(dangerousUrl, keyHex);

    window.location.hash = `#key=${keyHex}`;

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'test-link-123',
        redirectUrl: ciphertext,
      }),
    });

    render(<RedirectResolverPage />);

    await waitFor(() => {
      expect(screen.getByText(/Link Resolution Error/i)).toBeInTheDocument();
      expect(screen.getByText(/Security Warning: Destination URL contains an unsafe or blocked protocol scheme/i)).toBeInTheDocument();
      expect(window.location.replace).not.toHaveBeenCalled();
    });
  });

  it('reads the id from the address bar when served as the pre-rendered /r/shell page', async () => {
    mockRouteParams = { id: 'shell' };
    const keyHex = await generateDecryptionKey();
    const ciphertext = await encryptUrl('https://destination.com/from-shell', keyHex);
    const realId = '0b5f7c1e-8d2a-4c3b-9e4f-1a2b3c4d5e6f';
    (window as any).location.pathname = `/r/${realId}`;
    window.location.hash = `#key=${keyHex}`;
    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({ id: realId, redirectUrl: ciphertext }) });

    render(<RedirectResolverPage />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(`/api/redirect/${realId}`, { headers: { 'Accept': 'application/json' } });
      expect(window.location.replace).toHaveBeenCalledWith('https://destination.com/from-shell');
    });
  });
});
