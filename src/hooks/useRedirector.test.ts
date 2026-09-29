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

  it('successfully registers a dynamic redirect and updates localStorage with zero-knowledge encryption', async () => {
    const mockResponseData = {
      id: 'new-uuid-456',
      redirectUrl: 'enc:v1:mockiv:mockciphertext',
      adminKey: 'adm-key-new',
    };

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponseData,
    });

    const { result } = renderHook(() => useRedirector());

    let outcome: Awaited<ReturnType<typeof result.current.registerRedirect>> | undefined;
    await act(async () => {
      outcome = await result.current.registerRedirect('https://final-dest.com');
    });
    const record = outcome?.ok ? outcome.record : undefined;

    expect(fetchSpy).toHaveBeenCalledWith('/api/redirect/register', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.stringMatching(/"redirectUrl":"enc:v1:[a-fA-F0-9]+:[a-fA-F0-9]+"/),
    }));

    // Verify plain text URL was NOT sent in fetch payload
    const sentBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(sentBody.redirectUrl).not.toContain('https://final-dest.com');
    expect(sentBody.redirectUrl.startsWith('enc:v1:')).toBe(true);

    expect(record).toBeDefined();
    expect(record!.id).toBe('new-uuid-456');
    expect(record!.originalUrl).toBe('https://final-dest.com');
    expect(record!.redirectUrl).toContain('/r/new-uuid-456#key=');
    expect(record!.key).toBeDefined();
    expect(record!.adminKey).toBe('adm-key-new');
    expect(result.current.records).toHaveLength(1);

    const stored = JSON.parse(window.localStorage.getItem('qrcraftly:dynamic-redirects') || '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe('new-uuid-456');
  });

  it('successfully registers dynamic redirect with iosUrl and androidUrl options encrypted', async () => {
    const mockResponseData = {
      id: 'store-uuid-789',
      redirectUrl: 'enc:v1:mockiv:mockciphertext',
      iosUrl: 'enc:v1:mockiv:mockiosciphertext',
      androidUrl: 'enc:v1:mockiv:mockandroidciphertext',
      adminKey: 'adm-key-store',
    };

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponseData,
    });

    const { result } = renderHook(() => useRedirector());

    let outcome: Awaited<ReturnType<typeof result.current.registerRedirect>> | undefined;
    await act(async () => {
      outcome = await result.current.registerRedirect('https://example.com', {
        iosUrl: 'https://apps.apple.com/app/id123',
        androidUrl: 'https://play.google.com/store/apps/details?id=com.app',
      });
    });
    const record = outcome?.ok ? outcome.record : undefined;

    expect(fetchSpy).toHaveBeenCalledWith('/api/redirect/register', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }));

    const sentBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(sentBody.redirectUrl.startsWith('enc:v1:')).toBe(true);
    expect(sentBody.iosUrl.startsWith('enc:v1:')).toBe(true);
    expect(sentBody.androidUrl.startsWith('enc:v1:')).toBe(true);
    expect(sentBody.iosUrl).not.toContain('https://apps.apple.com');
    expect(sentBody.androidUrl).not.toContain('https://play.google.com');

    expect(record).toBeDefined();
    expect(record!.iosUrl).toBe('https://apps.apple.com/app/id123');
    expect(record!.androidUrl).toBe('https://play.google.com/store/apps/details?id=com.app');
  });

  it('successfully updates a dynamic redirect with re-encrypted target URL', async () => {
    const initialRecord = {
      id: 'existing-id',
      originalUrl: 'https://old-dest.com',
      redirectUrl: 'http://localhost:3000/r/existing-id#key=a1b2c3d4e5f60123456789abcdef0123456789abcdef0123456789abcdef0123',
      adminKey: 'admin-key',
      createdAt: new Date().toISOString(),
    };
    window.localStorage.setItem('qrcraftly:dynamic-redirects', JSON.stringify([initialRecord]));

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, redirectUrl: 'enc:v1:newiv:newciphertext' }),
    });

    const { result } = renderHook(() => useRedirector());

    let outcome: Awaited<ReturnType<typeof result.current.updateRedirect>> | undefined;
    await act(async () => {
      outcome = await result.current.updateRedirect('existing-id', 'admin-key', 'https://new-dest.com');
    });

    expect(outcome).toEqual({ ok: true });
    expect(fetchSpy).toHaveBeenCalledWith('/api/redirect/update', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }));

    const sentBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(sentBody.id).toBe('existing-id');
    expect(sentBody.adminKey).toBe('admin-key');
    expect(sentBody.newUrl.startsWith('enc:v1:')).toBe(true);
    expect(sentBody.newUrl).not.toContain('https://new-dest.com');

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

  describe('hardening (#973)', () => {
    const KEY = 'a1b2c3d4e5f60123456789abcdef0123456789abcdef0123456789abcdef0123';
    const existing = {
      id: 'existing-id',
      originalUrl: 'https://old-dest.com',
      redirectUrl: `http://localhost:3000/r/existing-id#key=${KEY}`,
      key: KEY,
      iosUrl: 'https://apps.apple.com/app/id1',
      androidUrl: 'https://play.google.com/x',
      adminKey: 'admin-key',
      createdAt: new Date().toISOString(),
    };

    it('sends "" explicitly to clear an override and omits untouched ones', async () => {
      window.localStorage.setItem('qrcraftly:dynamic-redirects', JSON.stringify([existing]));
      fetchSpy.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
      const { result } = renderHook(() => useRedirector());

      await act(async () => {
        await result.current.updateRedirect('existing-id', 'admin-key', 'https://new.com', { iosUrl: '' });
      });

      const sent = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(sent.iosUrl).toBe('');
      expect(sent).not.toHaveProperty('androidUrl');
      expect(result.current.records[0].iosUrl).toBeUndefined();
      expect(result.current.records[0].androidUrl).toBe('https://play.google.com/x');
    });

    it('refuses to update when the encryption key is missing instead of silently regenerating it', async () => {
      window.localStorage.setItem(
        'qrcraftly:dynamic-redirects',
        JSON.stringify([{ ...existing, key: undefined, redirectUrl: 'http://localhost:3000/r/existing-id' }]),
      );
      const { result } = renderHook(() => useRedirector());
      let outcome: Awaited<ReturnType<typeof result.current.updateRedirect>> | undefined;
      await act(async () => {
        outcome = await result.current.updateRedirect('existing-id', 'admin-key', 'https://new.com');
      });
      expect(outcome).toMatchObject({ ok: false, status: null });
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('surfaces the backend status and error message on failure', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => ({ error: 'Too many requests, try again in a minute' }),
      });
      const { result } = renderHook(() => useRedirector());
      let outcome: Awaited<ReturnType<typeof result.current.registerRedirect>> | undefined;
      await act(async () => {
        outcome = await result.current.registerRedirect('https://x.com', { turnstileToken: 't' });
      });
      expect(outcome).toEqual({ ok: false, status: 429, message: 'Too many requests, try again in a minute (HTTP 429)' });
      expect(result.current.error).toBe('Too many requests, try again in a minute (HTTP 429)');
    });

    it('keeps every record when registrations overlap (functional state updates)', async () => {
      let n = 0;
      fetchSpy.mockImplementation(async () => {
        n += 1;
        const id = `id-${n}`;
        await new Promise((r) => setTimeout(r, 5));
        return { ok: true, json: async () => ({ id, adminKey: `key-${id}` }) };
      });
      const { result } = renderHook(() => useRedirector());
      await act(async () => {
        await Promise.all([
          result.current.registerRedirect('https://a.com'),
          result.current.registerRedirect('https://b.com'),
          result.current.registerRedirect('https://c.com'),
        ]);
      });
      expect(result.current.records.map((r) => r.adminKey).sort()).toEqual(['key-id-1', 'key-id-2', 'key-id-3']);
      const stored = JSON.parse(window.localStorage.getItem('qrcraftly:dynamic-redirects') || '[]');
      expect(stored).toHaveLength(3);
    });

    it('survives localStorage throwing on read and write', async () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
        throw new DOMException('blocked', 'SecurityError');
      });
      vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
        throw new DOMException('full', 'QuotaExceededError');
      });
      fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'id-x', adminKey: 'k' }) });
      const { result } = renderHook(() => useRedirector());
      expect(result.current.records).toEqual([]);
      let outcome: Awaited<ReturnType<typeof result.current.registerRedirect>> | undefined;
      await act(async () => {
        outcome = await result.current.registerRedirect('https://x.com');
      });
      expect(outcome?.ok).toBe(true);
      expect(result.current.records).toHaveLength(1);
      expect(errSpy).toHaveBeenCalled();
    });
  });
});
