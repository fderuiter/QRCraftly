import { readFileSync, existsSync, writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';
import { shouldExcludePath, getRegistryRoutes, generateSitemap } from '../scripts/generate_sitemap';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Search Engine Indexing Prevention & Hybrid Sitemap Generation', () => {
  it('should explicitly forbid crawlers from accessing the developer sandbox in robots.txt', () => {
    const robotsPath = join(__dirname, '../public/robots.txt');
    expect(existsSync(robotsPath)).toBe(true);
    
    const robotsContent = readFileSync(robotsPath, 'utf8');
    expect(robotsContent).toContain('Disallow: /dev-sandbox');
  });

  it('should ensure the sitemap generator ignores draft, test, error, and dev-sandbox routes via its validation helper', () => {
    // Assert exclusion logic with diverse test paths
    expect(shouldExcludePath('dev-sandbox')).toBe(true);
    expect(shouldExcludePath('draft')).toBe(true);
    expect(shouldExcludePath('test')).toBe(true);
    expect(shouldExcludePath('404.html')).toBe(true);
    expect(shouldExcludePath('_error')).toBe(true);
    expect(shouldExcludePath('quarantine')).toBe(true);
    expect(shouldExcludePath('internal')).toBe(true);

    expect(shouldExcludePath('dist/client/draft/index.html')).toBe(true);
    expect(shouldExcludePath('dist/client/test/route.html')).toBe(true);
    expect(shouldExcludePath('dist/client/dev-sandbox/index.html')).toBe(true);
    expect(shouldExcludePath('dist/client/index.html')).toBe(false);
    expect(shouldExcludePath('dist/client/about.html')).toBe(false);
    expect(shouldExcludePath('dist/client/game/index.html')).toBe(false);
    expect(shouldExcludePath('dist/client/game.html')).toBe(false);
  });

  it('should verify game page config enables static pre-rendering', async () => {
    const gameConfig = (await import('../src/pages/game/+config')).default;
    expect(gameConfig.prerender).not.toBe(false);
  });

  it('should verify generated static HTML files contain valid canonical tags and DOM content if build output exists', () => {
    const distDir = join(__dirname, '../dist/client');
    if (existsSync(distDir)) {
      const publicRoutes = ['index.html', 'about/index.html', 'game/index.html', 'wifi-qr-code/index.html'];
      for (const routeFile of publicRoutes) {
        const filePath = join(distDir, routeFile);
        if (existsSync(filePath)) {
          const html = readFileSync(filePath, 'utf8');
          if (html.includes('<!DOCTYPE html>')) {
            expect(html).toContain('<link rel="canonical"');
            expect(html).toContain('https://qrcraftly.com');
            expect(html).toContain('<main');
          }
        }
      }
    }
  });

  it('should discover client-rendered tool routes from central application registries', () => {
    const registryRoutes = getRegistryRoutes();
    expect(registryRoutes).toContain('/game');
    expect(registryRoutes).toContain('/about');
    expect(registryRoutes).toContain('/wifi-qr-code');
    expect(registryRoutes.length).toBeGreaterThan(10);
  });

  it('should generate a sitemap merging pre-rendered pages and client-rendered registry routes without duplicates', () => {
    const distDir = join(__dirname, '../dist/client');
    const sitemapPath = join(distDir, 'sitemap.xml');

    if (!existsSync(distDir)) {
      mkdirSync(distDir, { recursive: true });
    }

    // Run sitemap generator
    generateSitemap();

    expect(existsSync(sitemapPath)).toBe(true);
    const sitemapXml = readFileSync(sitemapPath, 'utf8');

    // 1. Valid XML declaration and root tag
    expect(sitemapXml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    expect(sitemapXml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(sitemapXml).toContain('</urlset>');

    // 2. Contains static pre-rendered pages AND public client-rendered routes (like /game)
    expect(sitemapXml).toContain('<loc>https://qrcraftly.com</loc>');
    expect(sitemapXml).toContain('<loc>https://qrcraftly.com/about</loc>');
    expect(sitemapXml).toContain('<loc>https://qrcraftly.com/game</loc>');
    expect(sitemapXml).toContain('<loc>https://qrcraftly.com/wifi-qr-code</loc>');

    // 3. Omitted routes (dev-sandbox, _error, 404, etc.)
    expect(sitemapXml).not.toContain('/dev-sandbox');
    expect(sitemapXml).not.toContain('/_error');
    expect(sitemapXml).not.toContain('/404');

    // 4. Zero duplicate URL entries
    const matches = sitemapXml.match(/<loc>(.*?)<\/loc>/g) || [];
    const locUrls = matches.map(m => m.replace(/<\/?loc>/g, ''));
    const uniqueLocUrls = new Set(locUrls);
    expect(locUrls.length).toBe(uniqueLocUrls.size);

    // 5. All URLs use full absolute canonical web addresses
    for (const url of locUrls) {
      expect(url).toMatch(/^https?:\/\//);
    }
  });
});

