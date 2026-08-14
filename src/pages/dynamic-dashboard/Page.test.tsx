import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Page from './+Page';
import { useRedirector } from '@/hooks/useRedirector';

// Mock the hook
vi.mock('@/hooks/useRedirector', () => ({
  useRedirector: vi.fn(),
}));

describe('DynamicDashboardPage', () => {
  const mockUpdateRedirect = vi.fn();
  const mockFetchStats = vi.fn();
  const mockDeleteRecord = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when there are no records', () => {
    (useRedirector as any).mockReturnValue({
      records: [],
      updateRedirect: mockUpdateRedirect,
      fetchStats: mockFetchStats,
      deleteRecord: mockDeleteRecord,
      isLoading: false,
    });

    render(<Page />);

    expect(screen.getByText(/No Dynamic QR Codes Found/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create dynamic QR code/i })).toBeInTheDocument();
  });

  it('renders records and updates stats', async () => {
    const mockRecord = {
      id: 'id-123',
      originalUrl: 'https://dest.com',
      redirectUrl: 'https://qrcraftly.com/api/redirect/id-123',
      adminKey: 'key-abc',
      createdAt: new Date().toISOString(),
    };

    (useRedirector as any).mockReturnValue({
      records: [mockRecord],
      updateRedirect: mockUpdateRedirect,
      fetchStats: mockFetchStats.mockResolvedValue({ scans: 15 }),
      deleteRecord: mockDeleteRecord,
      isLoading: false,
    });

    render(<Page />);

    expect(screen.getByText('https://dest.com')).toBeInTheDocument();
    expect(screen.getByText('https://qrcraftly.com/api/redirect/id-123')).toBeInTheDocument();

    // Scans should update via stats effect
    await waitFor(() => {
      expect(screen.getByText('15')).toBeInTheDocument();
    });
  });
});
