import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Search Engine Indexing Prevention', () => {
  it('should explicitly forbid crawlers from accessing the developer sandbox in robots.txt', () => {
    const robotsPath = join(__dirname, '../public/robots.txt');
    expect(existsSync(robotsPath)).toBe(true);
    
    const robotsContent = readFileSync(robotsPath, 'utf8');
    expect(robotsContent).toContain('Disallow: /dev-sandbox');
  });

  it('should ensure the sitemap generator ignores the developer sandbox route', () => {
    const sitemapGenPath = join(__dirname, '../scripts/generate_sitemap.js');
    expect(existsSync(sitemapGenPath)).toBe(true);
    
    const sitemapGenContent = readFileSync(sitemapGenPath, 'utf8');
    expect(sitemapGenContent).toContain('dev-sandbox');
    expect(sitemapGenContent).toContain('draft');
    expect(sitemapGenContent).toContain('test');
  });
});
