import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadEnv } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let env: Record<string, string> = {};
try {
  const mode = process.env.NODE_ENV || 'production';
  env = loadEnv(mode, process.cwd(), '');
} catch (error) {
  console.warn('[Sitemap] Failed to load env via Vite loadEnv:', error);
}

// Dynamically set process.env.VITE_DOMAIN so it is visible globally to all imported modules
const resolvedDomain = env.VITE_DOMAIN || process.env.VITE_DOMAIN || 'https://qrcraftly.com';
process.env.VITE_DOMAIN = resolvedDomain;

// Now import the shared business logic dynamically
const { resolvePublicUrl, getSanitizedPath } = await import('../src/utils/metadataEngine');
const { contentRegistry, auxiliaryRegistry } = await import('../src/data/contentRegistry');

const DIST_DIR = path.resolve(__dirname, '../dist/client');
const OUTPUT_FILE = process.env.SITEMAP_OUTPUT_PATH || path.join(DIST_DIR, 'sitemap.xml');


function findHtmlFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      findHtmlFiles(filePath, fileList);
    } else if (filePath.endsWith('.html')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

/**
 * Determines whether a given relative or absolute path/route should be excluded from the sitemap.
 * @param posixPath - The clean posix path of the file or route.
 * @returns True if the path should be excluded, false otherwise.
 */
export function shouldExcludePath(posixPath: string): boolean {
  const clean = posixPath.toLowerCase();
  if (
    clean.includes('404.html') ||
    clean.endsWith('404') ||
    clean.includes('_error') ||
    clean.includes('draft') ||
    clean.includes('test') ||
    clean.includes('dev-sandbox') ||
    clean.includes('quarantine') ||
    clean.includes('internal') ||
    clean.includes('@id')
  ) {
    return true;
  }
  return false;
}

/**
 * Collects candidate routes from central application registries (contentRegistry and auxiliaryRegistry).
 */
export function getRegistryRoutes(): string[] {
  const candidateRoutes: string[] = [];

  if (contentRegistry && typeof contentRegistry === 'object') {
    for (const [key, item] of Object.entries(contentRegistry)) {
      if (!item) continue;
      let route = '';
      if (item.url) {
        try {
          const parsed = new URL(item.url);
          route = parsed.pathname;
        } catch {
          route = item.url;
        }
      } else if (item.id) {
        route = item.id === 'index' ? '/' : `/${item.id}`;
      } else if (key) {
        route = key === 'index' ? '/' : `/${key}`;
      }

      if (route) candidateRoutes.push(route);
    }
  }

  if (auxiliaryRegistry && typeof auxiliaryRegistry === 'object') {
    for (const [key, item] of Object.entries(auxiliaryRegistry)) {
      if (!item) continue;
      let route = '';
      if ('url' in item && typeof (item as any).url === 'string') {
        try {
          const parsed = new URL((item as any).url);
          route = parsed.pathname;
        } catch {
          route = (item as any).url;
        }
      } else if (item.id) {
        route = item.id === 'index' ? '/' : `/${item.id}`;
      } else if (key) {
        route = key === 'index' ? '/' : `/${key}`;
      }

      if (route) candidateRoutes.push(route);
    }
  }

  return candidateRoutes;
}

/**
 * Collects candidate routes from physical pre-rendered HTML build output.
 */
export function getPreRenderedHtmlRoutes(distDir: string = DIST_DIR): string[] {
  if (!fs.existsSync(distDir)) return [];

  const htmlFiles = findHtmlFiles(distDir);
  const routes: string[] = [];

  for (const file of htmlFiles) {
    const relativePath = path.relative(distDir, file);
    const posixPath = relativePath.split(path.sep).join('/');

    let route = `/${posixPath}`;
    if (route.endsWith('/index.html')) {
      route = route.slice(0, -10);
    } else if (route.endsWith('index.html')) {
      route = route.slice(0, -10);
    } else if (route.endsWith('.html')) {
      route = route.slice(0, -5);
    }

    if (route === '') {
      route = '/';
    }

    routes.push(route);
  }

  return routes;
}

export function generateSitemap() {
  if (!fs.existsSync(DIST_DIR)) {
    console.warn(`[Sitemap] Directory ${DIST_DIR} does not exist. Creating output directory.`);
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  const htmlRoutes = getPreRenderedHtmlRoutes(DIST_DIR);
  const registryRoutes = getRegistryRoutes();
  const allCandidates = [...htmlRoutes, ...registryRoutes];

  const uniqueRoutesMap = new Map<string, string>(); // sanitizedPath -> rawRoute

  for (const rawRoute of allCandidates) {
    if (shouldExcludePath(rawRoute)) continue;

    const cleanPath = getSanitizedPath(rawRoute);
    if (shouldExcludePath(cleanPath)) continue;

    if (!uniqueRoutesMap.has(cleanPath)) {
      uniqueRoutesMap.set(cleanPath, rawRoute);
    }
  }

  const sortedCleanPaths = Array.from(uniqueRoutesMap.keys()).sort((a, b) => {
    if (a === '/') return -1;
    if (b === '/') return 1;
    return a.localeCompare(b);
  });

  const urls: string[] = [];

  for (const cleanPath of sortedCleanPaths) {
    const fullUrl = resolvePublicUrl(cleanPath);
    const priority = (cleanPath === '/' || cleanPath === '') ? '1.0' : '0.8';

    const escapedUrl = fullUrl
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    urls.push(`  <url>
    <loc>${escapedUrl}</loc>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`);
  }

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  fs.writeFileSync(OUTPUT_FILE, sitemapXml, 'utf8');
  console.log(`[Sitemap] Generated ${OUTPUT_FILE} with ${urls.length} URLs.`);
}

// Only execute if run directly
const isMain = process.argv[1] ? (path.resolve(process.argv[1]) === path.resolve(__filename)) : false;

if (isMain) {
  generateSitemap();
}
