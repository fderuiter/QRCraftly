import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';
import { shouldExcludePath } from '../scripts/generate_sitemap';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Search Engine Indexing Prevention', () => {
  it('should explicitly forbid crawlers from accessing the developer sandbox in robots.txt', () => {
    const robotsPath = join(__dirname, '../public/robots.txt');
    expect(existsSync(robotsPath)).toBe(true);
    
    const robotsContent = readFileSync(robotsPath, 'utf8');
    expect(robotsContent).toContain('Disallow: /dev-sandbox');
  });

  it('should ensure the sitemap generator ignores draft, test, and dev-sandbox routes via its validation helper', () => {
    // Assert exclusion logic with diverse test paths
    expect(shouldExcludePath('dev-sandbox')).toBe(true);
    expect(shouldExcludePath('draft')).toBe(true);
    expect(shouldExcludePath('test')).toBe(true);
    expect(shouldExcludePath('404.html')).toBe(true);

    expect(shouldExcludePath('dist/client/draft/index.html')).toBe(true);
    expect(shouldExcludePath('dist/client/test/route.html')).toBe(true);
    expect(shouldExcludePath('dist/client/dev-sandbox/index.html')).toBe(true);
    expect(shouldExcludePath('dist/client/index.html')).toBe(false);
    expect(shouldExcludePath('dist/client/about.html')).toBe(false);
  });
});
