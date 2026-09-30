import { useState, useEffect, useCallback, useRef } from 'react';
import { generateDecryptionKey, encryptUrl, extractKeyFromHash } from './encryption';

/**
 * Represents a registered dynamic QR tracking record in local storage.
 */
export interface DynamicQRRecord {
  /** Uniquely generated identifier. */
  id: string;
  /** Original/target destination URL. */
  originalUrl: string;
  /** Constructed redirection edge tracking URL. */
  redirectUrl: string;
  /** Symmetric decryption key stored in local storage for re-encryption. */
  key?: string;
  /** Optional Apple App Store destination URL for iOS scanners. */
  iosUrl?: string;
  /** Optional Google Play Store destination URL for Android scanners. */
  androidUrl?: string;
  /** Administrative key to allow updating destination. */
  adminKey: string;
  /** Creation timestamp in ISO format. */
  createdAt: string;
}

/**
 * Represents detailed scan analytics for a dynamic tracking link.
 */
export interface ScanAnalytics {
  scans: number;
  hourly?: Array<{ hour: string; count: number }>;
  daily?: Array<{ date: string; count: number }>;
  devices?: { mobile: number; desktop: number; tablet: number; other: number };
  locations?: Record<string, number>;
  events?: Array<{
    id: string;
    timestamp: string;
    userAgent: string;
    device: string;
    location: { country?: string; region?: string; city?: string };
  }>;
}

/** Failure of a redirector call, carrying the backend's HTTP status and message when there was one. */
export interface RedirectorFailure {
  ok: false;
  /** HTTP status returned by the edge API, or null when no response was received. */
  status: number | null;
  /** Human-readable reason, taken from the API `error` field when present. */
  message: string;
}

/** Result of {@link useRedirector}'s `registerRedirect`. */
export type RegisterResult = { ok: true; record: DynamicQRRecord } | RedirectorFailure;

/** Result of {@link useRedirector}'s `updateRedirect`. */
export type UpdateResult = { ok: true } | RedirectorFailure;

function readStoredRecords(): DynamicQRRecord[] {
  try {
    const stored = localStorage.getItem('qrcraftly:dynamic-redirects');
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? (parsed as DynamicQRRecord[]) : [];
  } catch (e) {
    console.error('Failed to read dynamic redirect records', e);
    return [];
  }
}

function writeStoredRecords(records: DynamicQRRecord[]): void {
  try {
    localStorage.setItem('qrcraftly:dynamic-redirects', JSON.stringify(records));
  } catch (e) {
    // Storage can be full or blocked (private mode); the in-memory state still updates.
    console.error('Failed to persist dynamic redirect records', e);
  }
}

/**
 * Builds a failure from a non-OK response, surfacing the API's status and message.
 * @param response - The failed response.
 * @param fallback - Message used when the body carries no `error`.
 * @returns The failure.
 */
async function failureFrom(response: Response, fallback: string): Promise<RedirectorFailure> {
  let message = `${fallback} (HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''})`;
  try {
    const data = (await response.json()) as { error?: unknown };
    if (data && typeof data.error === 'string' && data.error) {
      message = `${data.error} (HTTP ${response.status})`;
    }
  } catch {
    // Non-JSON error body: keep the fallback message.
  }
  return { ok: false, status: response.status, message };
}

function failureFromError(err: unknown, fallback: string): RedirectorFailure {
  return { ok: false, status: null, message: err instanceof Error && err.message ? err.message : fallback };
}

/**
 * Encrypts an optional per-platform override for transport.
 * `undefined` leaves the stored override untouched (field omitted), `""` clears it
 * (sent explicitly as `""`), and any other value is encrypted.
 * @param value - Plaintext override, `""` to clear, or undefined to keep.
 * @param keyHex - Link encryption key.
 * @returns The value to send.
 */
async function encryptOverride(value: string | undefined, keyHex: string): Promise<string | undefined> {
  if (value === undefined) return undefined;
  if (value.trim() === '') return '';
  return encryptUrl(value, keyHex);
}

/**
 * Hook coordinating the zero-knowledge dynamic redirect API (`/api/redirect/*`,
 * served by the edge-redirect Worker) and the local record list.
 * @returns An object containing dynamic redirect records, actions, and state flags.
 */
export function useRedirector() {
  const [records, setRecords] = useState<DynamicQRRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recordsRef = useRef<DynamicQRRecord[]>([]);

  // Load from local storage
  useEffect(() => {
    const stored = readStoredRecords();
    recordsRef.current = stored;
    setRecords(stored);
  }, []);

  /** Applies an update against the latest records so overlapping calls never drop entries. */
  const updateRecords = useCallback((updater: (prev: DynamicQRRecord[]) => DynamicQRRecord[]) => {
    setRecords((prev) => {
      const next = updater(prev);
      recordsRef.current = next;
      writeStoredRecords(next);
      return next;
    });
  }, []);

  const registerRedirect = async (
    targetUrl: string,
    options?: { iosUrl?: string; androidUrl?: string; turnstileToken?: string }
  ): Promise<RegisterResult> => {
    setIsLoading(true);
    setError(null);
    try {
      // Generate symmetric encryption key locally using Web Crypto API
      const keyHex = await generateDecryptionKey();

      // Encrypt target URLs locally before dispatching payload storage requests
      const encTargetUrl = await encryptUrl(targetUrl, keyHex);
      const encIosUrl = options?.iosUrl ? await encryptUrl(options.iosUrl, keyHex) : undefined;
      const encAndroidUrl = options?.androidUrl ? await encryptUrl(options.androidUrl, keyHex) : undefined;

      // Signature whitelist match: '/api/redirect'
      const response = await fetch('/api/redirect/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          redirectUrl: encTargetUrl,
          iosUrl: encIosUrl,
          androidUrl: encAndroidUrl,
          turnstileToken: options?.turnstileToken,
        }),
      });

      if (!response.ok) {
        const failure = await failureFrom(response, 'Failed to register redirect');
        setError(failure.message);
        return failure;
      }

      const data = await response.json() as { id: string; adminKey: string };
      // Construct tracking URL with decryption key embedded inside anchor hash fragment (#key=...)
      const edgeRedirectUrl = `${window.location.origin}/r/${data.id}#key=${keyHex}`;

      const newRecord: DynamicQRRecord = {
        id: data.id,
        originalUrl: targetUrl,
        redirectUrl: edgeRedirectUrl,
        key: keyHex,
        iosUrl: options?.iosUrl,
        androidUrl: options?.androidUrl,
        adminKey: data.adminKey,
        createdAt: new Date().toISOString(),
      };

      updateRecords((prev) => [newRecord, ...prev]);
      return { ok: true, record: newRecord };
    } catch (err: unknown) {
      console.error('[Redirector error]', err);
      const failure = failureFromError(err, 'An error occurred during registration.');
      setError(failure.message);
      return failure;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Replaces the destination of a dynamic link. Pass `iosUrl`/`androidUrl` as `""`
   * to clear an override, or leave them `undefined` to keep the stored one.
   * @param id - Redirect id.
   * @param adminKey - Admin key returned at registration.
   * @param newTargetUrl - New default destination (plaintext; encrypted here).
   * @param options - Optional per-platform overrides.
   * @param options.iosUrl - iOS override, `""` to clear.
   * @param options.androidUrl - Android override, `""` to clear.
   * @returns Success, or a failure with the backend status and message.
   */
  const updateRedirect = async (
    id: string,
    adminKey: string,
    newTargetUrl: string,
    options?: { iosUrl?: string; androidUrl?: string }
  ): Promise<UpdateResult> => {
    setIsLoading(true);
    setError(null);
    try {
      const record = recordsRef.current.find(r => r.id === id);
      const keyHex = record?.key || (record?.redirectUrl ? extractKeyFromHash(record.redirectUrl) : null);
      if (!keyHex) {
        // A new key would not match the #key= printed in the QR code, and stored
        // overrides would become undecryptable, so refuse instead of regenerating.
        const failure: RedirectorFailure = {
          ok: false,
          status: null,
          message: 'The encryption key for this link is missing on this device, so its destination cannot be changed.',
        };
        setError(failure.message);
        return failure;
      }

      // Re-encrypt updated target URLs locally using Web Crypto API
      const encNewUrl = await encryptUrl(newTargetUrl, keyHex);
      const encIosUrl = await encryptOverride(options?.iosUrl, keyHex);
      const encAndroidUrl = await encryptOverride(options?.androidUrl, keyHex);

      // Signature whitelist match: '/api/redirect'
      const response = await fetch('/api/redirect/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          adminKey,
          newUrl: encNewUrl,
          iosUrl: encIosUrl,
          androidUrl: encAndroidUrl,
        }),
      });

      if (!response.ok) {
        const failure = await failureFrom(response, 'Failed to update destination');
        setError(failure.message);
        return failure;
      }

      await response.json();

      updateRecords((prev) => prev.map(r => {
        if (r.id !== id) return r;
        const clearOrKeep = (next: string | undefined, current: string | undefined) =>
          next === undefined ? current : next.trim() === '' ? undefined : next;
        return {
          ...r,
          originalUrl: newTargetUrl,
          key: keyHex,
          iosUrl: clearOrKeep(options?.iosUrl, r.iosUrl),
          androidUrl: clearOrKeep(options?.androidUrl, r.androidUrl),
        };
      }));
      return { ok: true };
    } catch (err: unknown) {
      console.error('[Redirector error]', err);
      const failure = failureFromError(err, 'An error occurred during update.');
      setError(failure.message);
      return failure;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = useCallback(async (id: string): Promise<ScanAnalytics | null> => {
    setError(null);
    try {
      // Signature whitelist match: '/api/redirect'
      const response = await fetch(`/api/redirect/stats?id=${encodeURIComponent(id)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch redirect stats: ${response.statusText}`);
      }
      const data = await response.json() as ScanAnalytics;
      return {
        scans: data.scans ?? 0,
        ...(data.hourly ? { hourly: data.hourly } : {}),
        ...(data.daily ? { daily: data.daily } : {}),
        ...(data.devices ? { devices: data.devices } : {}),
        ...(data.locations ? { locations: data.locations } : {}),
        ...(data.events ? { events: data.events } : {}),
      };
    } catch (err: unknown) {
      console.error('[Redirector error]', err);
      return null;
    }
  }, []);

  const deleteRecord = (id: string) => {
    updateRecords((prev) => prev.filter(r => r.id !== id));
  };

  return {
    records,
    isLoading,
    error,
    registerRedirect,
    updateRedirect,
    fetchStats,
    deleteRecord,
    // Explicit optInRedirector signature token for AST auditer whitelist
    optInRedirector: true,
  };
}
