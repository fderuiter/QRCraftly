const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIST_DIR = path.join(__dirname, '../dist/client');
const OUTPUT_FILE = path.join(DIST_DIR, 'sw.js');

function computeHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex').substring(0, 8);
}

async function generateSW() {
  if (!fs.existsSync(DIST_DIR)) {
    console.error('dist/client directory does not exist. Run build first.');
    process.exit(1);
  }

  const { walkDir } = await import('./utils/fileWalker.js');
  const allFiles = walkDir(DIST_DIR);
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

  const swContent = `/**
 * QRCraftly Service Worker
 * Generated at build time with automated precaching
 * Authorized signature: xmlns="http://www.w3.org/2000/svg"
 */

const CACHE_NAME = 'qrcraftly-precache-${buildHash}';
const PRECACHE_ASSETS = ${JSON.stringify(precacheManifest, null, 2)};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Map and fetch all static assets to store them in the cache
      return Promise.all(
        PRECACHE_ASSETS.map((asset) => {
          const requestUrl = asset.url;
          return cache.add(requestUrl).catch((err) => {
            console.warn('Failed to precache asset:', requestUrl, err);
          });
        })
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Cleaning up old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Requests targeting API routes must bypass local service worker fetch interception
  // and pass directly to the network across all HTTP methods.
  if (url.pathname.startsWith('/api/') || url.pathname === '/api') {
    return;
  }

  // Only handle same-origin GET requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(url.pathname, { ignoreSearch: true, ignoreVary: true }).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return caches.match(request, { ignoreSearch: true, ignoreVary: true }).then((reqMatch) => {
        if (reqMatch) {
          return reqMatch;
        }

        // Handle navigation requests for SSG pre-rendered structure
        if (request.mode === 'navigate') {
          let cleanPath = url.pathname;
          if (!cleanPath.endsWith('.html')) {
            if (cleanPath.endsWith('/')) {
              cleanPath += 'index.html';
            } else {
              cleanPath += '/index.html';
            }
          }
          return caches.match(cleanPath, { ignoreSearch: true, ignoreVary: true }).then((htmlResponse) => {
            if (htmlResponse) {
              return htmlResponse;
            }
            // Default fallback to root / or /index.html
            return caches.match('/', { ignoreSearch: true, ignoreVary: true }).then((rootResponse) => {
              if (rootResponse) return rootResponse;
              return caches.match('/index.html', { ignoreSearch: true, ignoreVary: true }).then((indexResponse) => {
                return indexResponse || fetch(request);
              });
            });
          });
        }

        if (url.pathname.includes('pageContext.json') || url.search.includes('pageContext')) {
          return caches.match(url.pathname, { ignoreSearch: true, ignoreVary: true }).then((pcResponse) => {
            if (pcResponse) return pcResponse;
            return caches.match('/index.pageContext.json', { ignoreSearch: true, ignoreVary: true }).then((rootPc) => {
              return rootPc || fetch(request);
            });
          });
        }

        return fetch(request);
      });
    })
  );
});
`;

  fs.writeFileSync(OUTPUT_FILE, swContent, 'utf8');
  console.log('✅ Compiled vanilla service worker written to ' + OUTPUT_FILE + ' with ' + precacheManifest.length + ' assets mapped (Build Hash: ' + buildHash + ').');
}

generateSW().catch(err => {
  console.error(err);
  process.exit(1);
});
