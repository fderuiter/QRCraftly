import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { generateLhciManifest } from '../scripts/generate_lhci_manifest.js';

describe('generate_lhci_manifest', () => {
  let work: string;
  let distClient: string;
  let basePath: string;
  let outputPath: string;
  const base = {
    ci: {
      collect: { staticDistDir: './dist/client' },
      assert: { assertions: { 'categories:performance': ['error', { minScore: 0.75 }] } }
    }
  };

  beforeEach(() => {
    work = fs.mkdtempSync(path.join(os.tmpdir(), 'lhci-'));
    distClient = path.join(work, 'dist', 'client');
    for (const page of ['index.html', '404.html', 'about/index.html', 'file-transfer/receive/index.html', 'dev-sandbox/index.html']) {
      fs.mkdirSync(path.dirname(path.join(distClient, page)), { recursive: true });
      fs.writeFileSync(path.join(distClient, page), '<html></html>');
    }
    basePath = path.join(work, 'lighthouserc.json');
    outputPath = path.join(work, 'dist', 'lighthouserc.json');
    fs.writeFileSync(basePath, JSON.stringify(base, null, 2) + '\n');
  });

  afterEach(() => {
    fs.rmSync(work, { recursive: true, force: true });
  });

  it('writes the generated config to the output path and never modifies the tracked base config', () => {
    const baseBefore = fs.readFileSync(basePath, 'utf8');
    const urls = generateLhciManifest(distClient, basePath, outputPath);

    expect(fs.readFileSync(basePath, 'utf8')).toBe(baseBefore);
    expect(urls?.sort()).toEqual(['http://localhost/', 'http://localhost/about', 'http://localhost/file-transfer/receive']);

    const generated = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    expect(generated.ci.collect.url.sort()).toEqual(urls?.sort());
    expect(generated.ci.collect.staticDistDir).toBe('./dist/client');
    expect(generated.ci.assert.assertions['categories:performance']).toEqual(['error', { minScore: 0.75 }]);
    expect(generated.ci.assert.assertions['categories:seo']).toEqual(['error', { minScore: 0.95 }]);
  });

  it('skips generation when the build output is missing', () => {
    expect(generateLhciManifest(path.join(work, 'missing'), basePath, outputPath)).toBeNull();
    expect(fs.existsSync(outputPath)).toBe(false);
  });
});
