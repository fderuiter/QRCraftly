const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIST_DIR = path.join(__dirname, '../dist/client');
const OUTPUT_FILE = path.join(DIST_DIR, 'sw.js');

function getFilesRecursively(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(fullPath));
    } else {
      results.push(fullPath);
    }
  });
  return results;
}

function computeHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex').substring(0, 8);
}

/**
 * Builds the service worker source for a given precache manifest.
 *
 * Update model: the new worker installs and then waits. It never calls
 * skipWaiting() on its own, so open tabs keep their current worker and
 * their lazily-loaded chunks. The page shows an "update available" toast
 * and posts SKIP_WAITING when the user accepts. On activate, the current
 * and the previous precache are kept, so a tab still running the previous
 * build can load its hashed chunks; older caches are deleted.
 * @param {Array<{url: string, revision: string}>} precacheManifest Files to precache.
 * @param {string} buildHash Unique hash of this build.
 * @returns {string} Service worker JavaScript source.
 */
function buildSwContent(precacheManifest, buildHash) {
  return `/**
 * QRCraftly Service Worker
 * Generated at build time with automated precaching
 */

const CACHE_PREFIX = 'qrcraftly-precache-';
const CACHE_NAME = CACHE_PREFIX + '${buildHash}';
const META_CACHE = 'qrcraftly-meta';
const META_KEY = '/__qrcraftly_cache_history__';
const CACHE_HISTORY_LIMIT = 2;
const PRECACHE_ASSETS = ${JSON.stringify(precacheManifest, null, 2)};
const PRECACHED_PATHS = new Set(PRECACHE_ASSETS.map((asset) => asset.url));

// Paths the service worker must never answer: API calls and dynamic
// redirect links (/r/<id>) always go to the network.
const BYPASS_PREFIXES = ['/api/', '/r/'];

function isBypassed(pathname) {
  if (pathname === '/api' || pathname === '/r') return true;
  return BYPASS_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function toHtmlPath(pathname) {
  if (pathname.endsWith('.html')) return pathname;
  return pathname.endsWith('/') ? pathname + 'index.html' : pathname + '/index.html';
}

async function readCacheHistory() {
  try {
    const meta = await caches.open(META_CACHE);
    const response = await meta.match(META_KEY);
    if (!response) return [];
    const history = await response.json();
    return Array.isArray(history) ? history.filter((name) => typeof name === 'string') : [];
  } catch (err) {
    return [];
  }
}

async function writeCacheHistory(history) {
  const meta = await caches.open(META_CACHE);
  await meta.put(META_KEY, new Response(JSON.stringify(history), { headers: { 'Content-Type': 'application/json' } }));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        PRECACHE_ASSETS.map((asset) => {
          return cache.add(asset.url).catch((err) => {
            console.warn('Failed to precache asset:', asset.url, err);
          });
        })
      );
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const history = (await readCacheHistory()).filter((name) => name !== CACHE_NAME);
      history.push(CACHE_NAME);
      const keep = new Set(history.slice(-CACHE_HISTORY_LIMIT));
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name.startsWith(CACHE_PREFIX) && !keep.has(name))
          .map((name) => caches.delete(name))
      );
      await writeCacheHistory(Array.from(keep));
      await self.clients.claim();
    })()
  );
});

async function matchPrecache(pathname) {
  // caches.match searches every cache, so chunks from the previous build
  // are still served to tabs that loaded it.
  return caches.match(pathname, { ignoreSearch: true, ignoreVary: true });
}

async function handleNavigation(request, url) {
  const htmlPath = toHtmlPath(url.pathname);
  if (PRECACHED_PATHS.has(url.pathname) || PRECACHED_PATHS.has(htmlPath)) {
    const cached = (await matchPrecache(url.pathname)) || (await matchPrecache(htmlPath));
    if (cached) return cached;
  }
  try {
    // Unknown routes go to the network so the server can answer with the
    // right page or a real 404.
    return await fetch(request);
  } catch (err) {
    // Offline: fall back to the cached shell so the app still boots.
    const shell = (await matchPrecache('/')) || (await matchPrecache('/index.html'));
    if (shell) return shell;
    throw err;
  }
}

async function handleRequest(request, url) {
  const cached = await matchPrecache(url.pathname);
  if (cached) return cached;
  // pageContext.json and any other uncached asset: network only, never a
  // substitute from another route.
  return fetch(request);
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Requests targeting API routes must bypass local service worker fetch interception
  // and pass directly to the network across all HTTP methods.
  if (url.pathname.startsWith('/api/') || url.pathname === '/api') {
    return;
  }

  if (isBypassed(url.pathname)) {
    return;
  }

  // Only handle same-origin GET requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request, url));
    return;
  }

  event.respondWith(handleRequest(request, url));
});
`;
}

function generateSW() {
  if (!fs.existsSync(DIST_DIR)) {
    console.error('dist/client directory does not exist. Run build first.');
    process.exit(1);
  }

  const allFiles = getFilesRecursively(DIST_DIR);
  const precacheManifest = [];

  allFiles.forEach(file => {
    const relativePath = path.relative(DIST_DIR, file);
    
    // Skip service worker itself, sitemap, robots, or config files
    if (
      relativePath === 'sw.js' ||
      relativePath === 'sitemap.xml' ||
      relativePath === 'robots.txt' ||
      relativePath.startsWith('.vite')
    ) {
      return;
    }

    const hash = computeHash(file);
    // Standardize URL to start with a forward slash
    const url = '/' + relativePath.replace(/\\/g, '/');
    precacheManifest.push({
      url,
      revision: hash
    });
    if (relativePath === 'index.html') {
      precacheManifest.push({
        url: '/',
        revision: hash
      });
    }
  });

  // Calculate a unique build hash from the files
  const manifestString = JSON.stringify(precacheManifest);
  const buildHash = crypto.createHash('sha256').update(manifestString).digest('hex').substring(0, 12);

  const swContent = buildSwContent(precacheManifest, buildHash);
  fs.writeFileSync(OUTPUT_FILE, swContent, 'utf8');
  console.log('✅ Compiled vanilla service worker written to ' + OUTPUT_FILE + ' with ' + precacheManifest.length + ' assets mapped (Build Hash: ' + buildHash + ').');
}

if (require.main === module) {
  generateSW();
}

module.exports = { buildSwContent };
