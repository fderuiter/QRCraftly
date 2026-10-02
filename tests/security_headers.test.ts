import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HEADERS_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/_headers');

/**
 * Parses the global (`/*`) block of a Cloudflare `_headers` file into a header map.
 */
function readGlobalHeaders(): Map<string, string> {
  const lines = fs.readFileSync(HEADERS_PATH, 'utf8').split(/\r?\n/);
  const headers = new Map<string, string>();
  let inGlobalBlock = false;
  for (const line of lines) {
    if (!/^\s/.test(line) && line.trim() !== '') {
      inGlobalBlock = line.trim() === '/*';
      continue;
    }
    const separator = line.indexOf(':');
    if (inGlobalBlock && separator > 0) {
      headers.set(line.slice(0, separator).trim().toLowerCase(), line.slice(separator + 1).trim());
    }
  }
  return headers;
}

function readPermissionsPolicy(): Map<string, string> {
  const policy = readGlobalHeaders().get('permissions-policy') ?? '';
  const features = new Map<string, string>();
  for (const entry of policy.split(',').map(e => e.trim()).filter(Boolean)) {
    const [feature, allowlist] = entry.split('=');
    features.set(feature.trim(), (allowlist ?? '').trim());
  }
  return features;
}

describe('public/_headers security headers', () => {
  it('declares a Permissions-Policy for every route', () => {
    expect(readGlobalHeaders().has('permissions-policy')).toBe(true);
  });

  it('lets the site itself use geolocation for "Use Current Location" (#970)', () => {
    expect(readPermissionsPolicy().get('geolocation')).toBe('(self)');
  });

  it('keeps the microphone disabled, since no feature uses it', () => {
    expect(readPermissionsPolicy().get('microphone')).toBe('()');
  });

  it('keeps the camera available for the optical scanner', () => {
    const camera = readPermissionsPolicy().get('camera');
    expect(camera).toBeDefined();
    expect(camera).not.toBe('()');
  });

  it('keeps payment disabled', () => {
    expect(readPermissionsPolicy().get('payment')).toBe('()');
  });

  it('keeps the baseline hardening headers', () => {
    const headers = readGlobalHeaders();
    expect(headers.get('x-frame-options')).toBe('DENY');
    expect(headers.get('x-content-type-options')).toBe('nosniff');
    expect(headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(headers.get('strict-transport-security')).toMatch(/^max-age=\d+/);
  });

  it('allowlists no third-party font hosts (#970)', () => {
    expect(fs.readFileSync(HEADERS_PATH, 'utf8')).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
  });
});
