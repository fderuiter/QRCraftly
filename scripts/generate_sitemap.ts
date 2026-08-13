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

const DIST_DIR = path.resolve(__dirname, '../dist/client');
const OUTPUT_FILE = path.join(DIST_DIR, 'sitemap.xml');

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

function generateSitemap() {
  if (!fs.existsSync(DIST_DIR)) {
    console.warn(`[Sitemap] Directory ${DIST_DIR} does not exist. Skipping sitemap generation.`);
    return;
  }

  const htmlFiles = findHtmlFiles(DIST_DIR);
  const urls: string[] = [];

  for (const file of htmlFiles) {
    const relativePath = path.relative(DIST_DIR, file);
    const posixPath = relativePath.split(path.sep).join('/');
    
    // Exclude certain files/routes
    if (posixPath.endsWith('404.html')) continue;
    if (posixPath.includes('draft') || posixPath.includes('test') || posixPath.includes('dev-sandbox') || posixPath.includes('experiments')) continue;

    let route = `/${posixPath}`;
    
    // Clean up index.html from paths
    if (route.endsWith('/index.html')) {
      route = route.slice(0, -10); // remove '/index.html'
    } else if (route.endsWith('index.html')) {
      route = route.slice(0, -10); // just in case it's 'index.html' at root
    } else if (route.endsWith('.html')) {
      route = route.slice(0, -5); // remove '.html'
    }

    // Ensure route has leading slash (if empty, becomes /)
    if (route === '') {
      route = '/';
    }

    // Process crawling output using the shared resolvePublicUrl
    const fullUrl = resolvePublicUrl(route);
    const cleanPath = getSanitizedPath(route);
    const priority = (cleanPath === '/' || cleanPath === '') ? '1.0' : '0.8';

    urls.push(`  <url>
    <loc>${fullUrl}</loc>
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

generateSitemap();
