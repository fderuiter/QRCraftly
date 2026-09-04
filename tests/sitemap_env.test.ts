import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, unlinkSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execBinary } from './utils/execHelper';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sitemapScriptPath = join(__dirname, '../scripts/generate_sitemap.ts');
const distDir = join(__dirname, '../dist/client');
const sitemapPath = join(distDir, 'sitemap_env_test.xml');
const dummyHtmlFile = join(distDir, 'dummy-sample-route.html');
const indexHtmlFile = join(distDir, 'index.html');

let createdDistDir = false;
let createdIndexHtml = false;

describe('Sitemap Environment-Level Variable Resolution', () => {
  beforeAll(() => {
    // Ensure dist directory and a dummy html file exist to generate sitemap URLs
    if (!existsSync(distDir)) {
      mkdirSync(distDir, { recursive: true });
      createdDistDir = true;
    }
    if (!existsSync(indexHtmlFile)) {
      writeFileSync(indexHtmlFile, '<html></html>', 'utf8');
      createdIndexHtml = true;
    }
    writeFileSync(dummyHtmlFile, '<html></html>', 'utf8');

    if (existsSync(sitemapPath)) {
      try {
        unlinkSync(sitemapPath);
      } catch {}
    }
  });

  afterAll(() => {
    // Clean up dummy HTML file
    if (existsSync(dummyHtmlFile)) {
      try {
        unlinkSync(dummyHtmlFile);
      } catch {
        // Safe fallback if unlink fails
      }
    }

    if (createdIndexHtml && existsSync(indexHtmlFile)) {
      try {
        unlinkSync(indexHtmlFile);
      } catch {}
    }

    if (createdDistDir && existsSync(distDir)) {
      try {
        rmSync(distDir, { recursive: true, force: true });
      } catch {}
    }

    if (existsSync(sitemapPath)) {
      try {
        unlinkSync(sitemapPath);
      } catch {}
    }
  });

  it('should use fallback domain under native tsx when import.meta.env and VITE_DOMAIN are unavailable', () => {
    execBinary('npx', ['tsx', sitemapScriptPath], {
      env: {
        ...process.env,
        VITE_DOMAIN: '',
        NODE_ENV: 'production',
        SITEMAP_OUTPUT_PATH: sitemapPath,
      },
    });

    expect(existsSync(sitemapPath)).toBe(true);
    const content = readFileSync(sitemapPath, 'utf8');
    expect(content).toContain('<loc>https://qrcraftly.com</loc>');
    expect(content).toContain('<loc>https://qrcraftly.com/dummy-sample-route</loc>');
  }, 30000);

  it('should resolve and apply a custom staging domain via process.env', () => {
    execBinary('npx', ['tsx', sitemapScriptPath], {
      env: {
        ...process.env,
        VITE_DOMAIN: 'https://staging.qrcraftly.net',
        NODE_ENV: 'production',
        SITEMAP_OUTPUT_PATH: sitemapPath,
      },
    });

    expect(existsSync(sitemapPath)).toBe(true);
    const content = readFileSync(sitemapPath, 'utf8');
    expect(content).toContain('<loc>https://staging.qrcraftly.net</loc>');
    expect(content).toContain('<loc>https://staging.qrcraftly.net/dummy-sample-route</loc>');
    expect(content).not.toContain('https://qrcraftly.com');
  }, 30000);

  it('should sanitize and strip any trailing slashes from the resolved VITE_DOMAIN', () => {
    execBinary('npx', ['tsx', sitemapScriptPath], {
      env: {
        ...process.env,
        VITE_DOMAIN: 'https://staging-trailing.qrcraftly.net////',
        NODE_ENV: 'production',
        SITEMAP_OUTPUT_PATH: sitemapPath,
      },
    });

    expect(existsSync(sitemapPath)).toBe(true);
    const content = readFileSync(sitemapPath, 'utf8');
    // Ensure no double slashes on URLs like 'https://staging-trailing.qrcraftly.net//dummy-sample-route'
    expect(content).toContain('<loc>https://staging-trailing.qrcraftly.net</loc>');
    expect(content).toContain('<loc>https://staging-trailing.qrcraftly.net/dummy-sample-route</loc>');
  }, 30000);

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

      execBinary('npx', ['tsx', sitemapScriptPath], {
        env: {
          ...cleanedEnv,
          NODE_ENV: 'production',
          SITEMAP_OUTPUT_PATH: sitemapPath,
        },
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
          unlinkSync(envFilePath);
        } catch {}
      }
    }
  }, 30000);
});
