import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sitemapScriptPath = join(__dirname, '../scripts/generate_sitemap.ts');
const distDir = join(__dirname, '../dist/client');
const sitemapPath = join(distDir, 'sitemap.xml');
const backupPath = join(distDir, 'sitemap.xml.bak');
const dummyHtmlFile = join(distDir, 'dummy-sample-route.html');

describe('Sitemap Environment-Level Variable Resolution', () => {
  beforeAll(() => {
    // Ensure dist directory and a dummy html file exist to generate sitemap URLs
    if (!existsSync(distDir)) {
      mkdirSync(distDir, { recursive: true });
    }
    if (!existsSync(join(distDir, 'index.html'))) {
      writeFileSync(join(distDir, 'index.html'), '<html></html>', 'utf8');
    }
    writeFileSync(dummyHtmlFile, '<html></html>', 'utf8');

    // Backup original sitemap if it exists
    if (existsSync(sitemapPath)) {
      renameSync(sitemapPath, backupPath);
    }
  });

  afterAll(() => {
    // Clean up dummy HTML file
    if (existsSync(dummyHtmlFile)) {
      try {
        const { unlinkSync } = require('fs');
        unlinkSync(dummyHtmlFile);
      } catch {
        // Safe fallback if unlink fails
      }
    }

    // Restore original sitemap if backed up
    if (existsSync(backupPath)) {
      if (existsSync(sitemapPath)) {
        try {
          const { unlinkSync } = require('fs');
          unlinkSync(sitemapPath);
        } catch {}
      }
      renameSync(backupPath, sitemapPath);
    }
  });

  it('should use fallback domain when no VITE_DOMAIN environment variable or .env file is configured', () => {
    // Run the sitemap script with empty environment for VITE_DOMAIN
    execFileSync('npx', ['tsx', sitemapScriptPath], {
      env: {
        ...process.env,
        VITE_DOMAIN: '',
        NODE_ENV: 'production'
      }
    });

    expect(existsSync(sitemapPath)).toBe(true);
    const content = readFileSync(sitemapPath, 'utf8');
    expect(content).toContain('<loc>https://qrcraftly.com</loc>');
    expect(content).toContain('<loc>https://qrcraftly.com/dummy-sample-route</loc>');
  });

  it('should resolve and apply a custom staging domain via process.env', () => {
    // Run the sitemap script with VITE_DOMAIN set in env
    execFileSync('npx', ['tsx', sitemapScriptPath], {
      env: {
        ...process.env,
        VITE_DOMAIN: 'https://staging.qrcraftly.net',
        NODE_ENV: 'production'
      }
    });

    expect(existsSync(sitemapPath)).toBe(true);
    const content = readFileSync(sitemapPath, 'utf8');
    expect(content).toContain('<loc>https://staging.qrcraftly.net</loc>');
    expect(content).toContain('<loc>https://staging.qrcraftly.net/dummy-sample-route</loc>');
    expect(content).not.toContain('https://qrcraftly.com');
  });

  it('should sanitize and strip any trailing slashes from the resolved VITE_DOMAIN', () => {
    // Run with trailing slashes in VITE_DOMAIN
    execFileSync('npx', ['tsx', sitemapScriptPath], {
      env: {
        ...process.env,
        VITE_DOMAIN: 'https://staging-trailing.qrcraftly.net////',
        NODE_ENV: 'production'
      }
    });

    expect(existsSync(sitemapPath)).toBe(true);
    const content = readFileSync(sitemapPath, 'utf8');
    // Ensure no double slashes on URLs like 'https://staging-trailing.qrcraftly.net//dummy-sample-route'
    expect(content).toContain('<loc>https://staging-trailing.qrcraftly.net</loc>');
    expect(content).toContain('<loc>https://staging-trailing.qrcraftly.net/dummy-sample-route</loc>');
  });

  it('should support loading custom domain from a .env file loaded via Vite loadEnv', () => {
    const envFilePath = join(__dirname, '../.env.production');
    const hasExistingEnv = existsSync(envFilePath);
    let originalEnvContent = '';
    if (hasExistingEnv) {
      originalEnvContent = readFileSync(envFilePath, 'utf8');
    }

    try {
      // Write temporary .env.production file specifying custom domain
      writeFileSync(envFilePath, 'VITE_DOMAIN=https://dotenv-loaded.qrcraftly.org\n', 'utf8');

      // Run the sitemap script with VITE_DOMAIN removed from process.env to ensure it loads from .env file
      const cleanedEnv = { ...process.env };
      delete cleanedEnv.VITE_DOMAIN;

      execFileSync('npx', ['tsx', sitemapScriptPath], {
        env: {
          ...cleanedEnv,
          NODE_ENV: 'production'
        }
      });

      expect(existsSync(sitemapPath)).toBe(true);
      const content = readFileSync(sitemapPath, 'utf8');
      expect(content).toContain('<loc>https://dotenv-loaded.qrcraftly.org</loc>');
      expect(content).toContain('<loc>https://dotenv-loaded.qrcraftly.org/dummy-sample-route</loc>');
    } finally {
      // Cleanup temporary .env.production file
      if (hasExistingEnv) {
        writeFileSync(envFilePath, originalEnvContent, 'utf8');
      } else if (existsSync(envFilePath)) {
        try {
          const { unlinkSync } = require('fs');
          unlinkSync(envFilePath);
        } catch {}
      }
    }
  });
});
