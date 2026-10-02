import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';
import { resolvePublicUrl } from '../src/utils/metadataEngine';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Reads wrangler.jsonc, dropping full-line comments and trailing commas so JSON.parse accepts it.
 * @returns The parsed Wrangler configuration.
 */
function readWranglerConfig(): { assets?: { html_handling?: string; not_found_handling?: string } } {
  const raw = readFileSync(join(__dirname, '../wrangler.jsonc'), 'utf8');
  const json = raw
    .split(/\r?\n/)
    .filter((line) => !/^\s*\/\//.test(line))
    .join('\n')
    .replace(/,(\s*[}\]])/g, '$1');
  return JSON.parse(json);
}

describe('Static asset routing matches canonical URLs', () => {
  const assets = readWranglerConfig().assets ?? {};

  it('serves folder index pages without a trailing slash, like the canonical links', () => {
    // Canonicals drop the trailing slash, so /wifi-qr-code must answer 200 rather than
    // redirect to /wifi-qr-code/ (the Workers default, auto-trailing-slash, does that).
    expect(assets.html_handling).toBe('drop-trailing-slash');
    expect(resolvePublicUrl('/wifi-qr-code/')).toMatch(/\/wifi-qr-code$/);
  });

  it('answers unknown paths with the prerendered 404 page', () => {
    expect(assets.not_found_handling).toBe('404-page');
  });
});
