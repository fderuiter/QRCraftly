import { describe, it, expect, beforeEach } from 'vitest';
import { onRequestPost as registerHandler } from '../functions/api/redirect/register';
import { onRequestPost as updateHandler } from '../functions/api/redirect/update';
import { onRequestGet as getHandler } from '../functions/api/redirect/[id]';
import { onRequestGet as statsHandler } from '../functions/api/redirect/stats';
import { generateDecryptionKey, encryptUrl, decryptUrl, extractKeyFromHash } from '../src/utils/encryption';

describe('Zero-Knowledge Client-Encrypted Edge Dynamic Links Integration', () => {
  beforeEach(() => {
    (globalThis as any).__mockKV = new Map<string, string>();
    (globalThis as any).__mockDBStore = new Map<string, any>();
    delete (globalThis as any).__mockD1Instance;
  });

  it('Requirement 1 & 2: Encrypts target URL locally using Web Crypto before sending network registration request', async () => {
    const plainTargetUrl = 'https://my-private-site.com/confidential-document';
    const decryptionKey = await generateDecryptionKey();
    expect(decryptionKey).toHaveLength(64);

    const ciphertext = await encryptUrl(plainTargetUrl, decryptionKey);
    expect(ciphertext).toContain('enc:v1:');
    expect(ciphertext).not.toContain(plainTargetUrl);

    const request = new Request('https://domain.com/api/redirect/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ redirectUrl: ciphertext, turnstileToken: 'test-turnstile-token' }),
    });

    const response = await registerHandler({ request, env: {} });
    expect(response.status).toBe(200);

    const body = await response.json() as any;
    expect(body.id).toBeDefined();
    expect(body.adminKey).toBeDefined();

    // Requirement 3: Backend KV stores ONLY ciphertext strings
    const storedRaw = (globalThis as any).__mockKV.get(`redirect:${body.id}`);
    expect(storedRaw).toBeDefined();
    const stored = JSON.parse(storedRaw);

    expect(stored.redirectUrl).toBe(ciphertext);
    expect(stored.redirectUrl).not.toContain(plainTargetUrl);
    expect(stored.scans).toBe(0);
  });

  it('Requirement 4 & 5: Generated link contains decryption key in hash fragment and client resolves & decrypts payload locally', async () => {
    const targetUrl = 'https://secure-portal.com/dashboard?token=xyz';
    const key = await generateDecryptionKey();
    const ciphertext = await encryptUrl(targetUrl, key);

    // Register link
    const regReq = new Request('https://domain.com/api/redirect/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ redirectUrl: ciphertext, turnstileToken: 'test-turnstile-token' }),
    });
    const regRes = await registerHandler({ request: regReq, env: {} });
    const regBody = await regRes.json() as any;

    // Constructed QR code URL has key in hash fragment (#key=...)
    const qrCodeUrl = `https://domain.com/r/${regBody.id}#key=${key}`;
    expect(qrCodeUrl).toContain(`#key=${key}`);

    // Extract key from hash
    const extractedKey = extractKeyFromHash(new URL(qrCodeUrl).hash);
    expect(extractedKey).toBe(key);

    // Client fetches payload from /api/redirect/[id] (with Accept: application/json)
    const getReq = new Request(`https://domain.com/api/redirect/${regBody.id}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    const promises: Promise<any>[] = [];
    const getRes = await getHandler({
      request: getReq,
      env: {},
      params: { id: regBody.id },
      waitUntil: (p) => promises.push(p),
    });
    await Promise.all(promises);

    expect(getRes.status).toBe(200);
    const getBody = await getRes.json() as any;
    expect(getBody.redirectUrl).toBe(ciphertext);

    // Client decrypts ciphertext locally
    const decryptedUrl = await decryptUrl(getBody.redirectUrl, extractedKey!);
    expect(decryptedUrl).toBe(targetUrl);

    // Requirement 5: Scan count increments accurately
    const statsReq = new Request(`https://domain.com/api/redirect/stats?id=${regBody.id}`);
    const statsRes = await statsHandler({ request: statsReq, env: {} });
    const statsBody = await statsRes.json() as any;
    expect(statsBody.scans).toBe(1);
  });

  it('Requirement 6: Updating a dynamic link re-encrypts new target URL on the client without exposing plain text to network', async () => {
    const key = await generateDecryptionKey();
    const initialTarget = 'https://initial-site.com';
    const encInitial = await encryptUrl(initialTarget, key);

    // Register initial
    const regReq = new Request('https://domain.com/api/redirect/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ redirectUrl: encInitial, turnstileToken: 'test-turnstile-token' }),
    });
    const regRes = await registerHandler({ request: regReq, env: {} });
    const regBody = await regRes.json() as any;

    // Update with new destination URL
    const updatedTarget = 'https://updated-site.com/new-path';
    const encUpdated = await encryptUrl(updatedTarget, key);

    const updateReq = new Request('https://domain.com/api/redirect/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: regBody.id,
        adminKey: regBody.adminKey,
        newUrl: encUpdated,
      }),
    });

    const updateRes = await updateHandler({ request: updateReq, env: {} });
    expect(updateRes.status).toBe(200);

    // Backend KV stores updated ciphertext string
    const stored = JSON.parse((globalThis as any).__mockKV.get(`redirect:${regBody.id}`));
    expect(stored.redirectUrl).toBe(encUpdated);
    expect(stored.redirectUrl).not.toContain(updatedTarget);

    // Client decrypts updated payload
    const decryptedUpdated = await decryptUrl(stored.redirectUrl, key);
    expect(decryptedUpdated).toBe(updatedTarget);
  });
});
