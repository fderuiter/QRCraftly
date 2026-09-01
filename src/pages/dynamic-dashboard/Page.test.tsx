import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Page from './+Page';
import { useRedirector } from '@/hooks/useRedirector';

// Mock the hook
vi.mock('@/hooks/useRedirector', () => ({
  useRedirector: vi.fn(),
}));

describe('DynamicDashboardPage', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
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
  });

  it('gracefully redirects direct visits to the home page on mount', () => {
    render(<Page />);

    expect(window.location.replace).toHaveBeenCalledWith('/');
    expect(screen.getByText(/Redirecting to home.../i)).toBeInTheDocument();
  });

  it('does not display any active dynamic dashboard controls or cards while suppressed', () => {
    render(<Page />);

    expect(screen.queryByText(/No Dynamic QR Codes Found/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Dynamic Redirection Dashboard/i)).not.toBeInTheDocument();
  });
});
