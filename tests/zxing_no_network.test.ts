/**
 * The zxing-wasm glue ships with network loaders (fetch, a synchronous XMLHttpRequest and a
 * jsDelivr default URL). The build strips all of them (ADR 0023); these tests run the rewrite on the
 * installed glue so a zxing-wasm upgrade that changes it fails here first.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { rewriteZxingModule, zxingNoNetwork } from '../scripts/vite/zxingNoNetwork';

const DIST = path.resolve('node_modules/zxing-wasm/dist/es');
const READER = path.join(DIST, 'reader/index.js');
const SHARE = path.join(DIST, 'share.js');

describe('zxing-wasm no-network rewrite', () => {
  it('removes every network loader from the reader glue', () => {
    const out = rewriteZxingModule(READER, fs.readFileSync(READER, 'utf8'));
    expect(out).not.toBeNull();
    expect(out).not.toMatch(/\bfetch\(/);
    expect(out).not.toMatch(/XMLHttpRequest\(/);
    expect(out).toContain('zxing-wasm network loading is disabled');
  });

  it('drops the jsDelivr default so the wasm can only come from our own origin', () => {
    const out = rewriteZxingModule(SHARE, fs.readFileSync(SHARE, 'utf8'));
    expect(out).not.toMatch(/jsdelivr/);
  });

  it('leaves other modules alone and fails loudly when the glue changes', () => {
    expect(rewriteZxingModule('/app/src/main.ts', 'fetch(x)')).toBeNull();
    expect(() => rewriteZxingModule(['repo', 'node_modules', 'zxing-wasm', 'dist', 'es', 'reader', 'index.js'].join('\\'), 'fetch(a)')).toThrow(
      /expected 2 match/
    );
  });

  it('runs before other transforms', () => {
    expect(zxingNoNetwork()).toMatchObject({ name: 'qrcraftly:zxing-no-network', enforce: 'pre' });
  });
});
