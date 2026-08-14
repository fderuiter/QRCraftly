import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useRedirector } from './useRedirector';

describe('useRedirector Hook', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    window.localStorage.clear();
    fetchSpy = vi.fn();
    global.fetch = fetchSpy as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('initializes with empty records and correct default state', () => {
    const { result } = renderHook(() => useRedirector());
    expect(result.current.records).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.optInRedirector).toBe(true);
  });

  it('loads existing records from localStorage', () => {
    const mockRecord = {
      id: 'id-123',
      originalUrl: 'https://test.com',
      redirectUrl: 'http://localhost:3000/api/redirect/id-123',
      adminKey: 'admin-key-abc',
      createdAt: new Date().toISOString(),
    };
    window.localStorage.setItem('qrcraftly:dynamic-redirects', JSON.stringify([mockRecord]));

    const { result } = renderHook(() => useRedirector());
    expect(result.current.records).toHaveLength(1);
    expect(result.current.records[0].id).toBe('id-123');
  });

  it('successfully registers a dynamic redirect and updates localStorage', async () => {
    const mockResponseData = {
      id: 'new-uuid-456',
      redirectUrl: 'https://final-dest.com',
      adminKey: 'adm-key-new',
    };

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponseData,
    });

    const { result } = renderHook(() => useRedirector());

    let record;
    await act(async () => {
      record = await result.current.registerRedirect('https://final-dest.com');
    });

    expect(fetchSpy).toHaveBeenCalledWith('/api/redirect/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ redirectUrl: 'https://final-dest.com' }),
    });

    expect(record).toBeDefined();
    expect(record!.id).toBe('new-uuid-456');
    expect(record!.originalUrl).toBe('https://final-dest.com');
    expect(record!.adminKey).toBe('adm-key-new');
    expect(result.current.records).toHaveLength(1);

    const stored = JSON.parse(window.localStorage.getItem('qrcraftly:dynamic-redirects') || '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe('new-uuid-456');
  });

  it('successfully updates a dynamic redirect', async () => {
    const initialRecord = {
      id: 'existing-id',
      originalUrl: 'https://old-dest.com',
      redirectUrl: 'http://localhost:3000/api/redirect/existing-id',
      adminKey: 'admin-key',
      createdAt: new Date().toISOString(),
    };
    window.localStorage.setItem('qrcraftly:dynamic-redirects', JSON.stringify([initialRecord]));

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, redirectUrl: 'https://new-dest.com' }),
    });

    const { result } = renderHook(() => useRedirector());

    let success;
    await act(async () => {
      success = await result.current.updateRedirect('existing-id', 'admin-key', 'https://new-dest.com');
    });

    expect(success).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith('/api/redirect/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'existing-id', adminKey: 'admin-key', newUrl: 'https://new-dest.com' }),
    });

    expect(result.current.records[0].originalUrl).toBe('https://new-dest.com');
  });

  it('successfully fetches statistics', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'some-id', scans: 42, redirectUrl: 'https://dest.com' }),
    });

    const { result } = renderHook(() => useRedirector());

    let stats;
    await act(async () => {
      stats = await result.current.fetchStats('some-id');
    });

    expect(stats).toEqual({ scans: 42 });
    expect(fetchSpy).toHaveBeenCalledWith('/api/redirect/stats?id=some-id');
  });

  it('successfully deletes a record', () => {
    const initialRecord = {
      id: 'to-delete',
      originalUrl: 'https://dest.com',
      redirectUrl: 'http://localhost:3000/api/redirect/to-delete',
      adminKey: 'admin-key',
      createdAt: new Date().toISOString(),
    };
    window.localStorage.setItem('qrcraftly:dynamic-redirects', JSON.stringify([initialRecord]));

    const { result } = renderHook(() => useRedirector());
    expect(result.current.records).toHaveLength(1);

    act(() => {
      result.current.deleteRecord('to-delete');
    });

    expect(result.current.records).toHaveLength(0);
    const stored = JSON.parse(window.localStorage.getItem('qrcraftly:dynamic-redirects') || '[]');
    expect(stored).toHaveLength(0);
  });
});
