import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { buildSwContent } = require('../scripts/generate_sw.cjs') as {
  buildSwContent: (manifest: Array<{ url: string; revision: string }>, hash: string) => string;
};

type Listener = (event: FakeEvent) => void;

interface FakeEvent {
  request?: { url: string; method: string; mode?: string };
  data?: unknown;
  respondWith: (p: Promise<unknown>) => void;
  waitUntil: (p: Promise<unknown>) => void;
}

const ORIGIN = 'https://qrcraftly.com';

/** In-memory CacheStorage keyed by cache name, then by pathname. */
function createCacheStorage(initial: Record<string, Record<string, string>> = {}) {
  const store = new Map<string, Map<string, unknown>>();
  for (const [name, entries] of Object.entries(initial)) {
    store.set(name, new Map(Object.entries(entries)));
  }
  const keyOf = (req: unknown) => {
    const raw = typeof req === 'string' ? req : (req as { url: string }).url;
    return new URL(raw, ORIGIN).pathname;
  };
  const openCache = (name: string) => {
    if (!store.has(name)) store.set(name, new Map());
    const entries = store.get(name)!;
    return {
      add: async (url: string) => {
        entries.set(keyOf(url), `network:${keyOf(url)}`);
      },
      put: async (req: unknown, res: unknown) => {
        entries.set(keyOf(req), res);
      },
      match: async (req: unknown) => entries.get(keyOf(req)),
    };
  };
  return {
    store,
    api: {
      open: async (name: string) => openCache(name),
      keys: async () => Array.from(store.keys()),
      delete: async (name: string) => store.delete(name),
      match: async (req: unknown) => {
        for (const entries of store.values()) {
          const hit = entries.get(keyOf(req));
          if (hit !== undefined) return hit;
        }
        return undefined;
      },
    },
  };
}

function loadWorker(options: {
  manifest?: Array<{ url: string; revision: string }>;
  hash?: string;
  caches: ReturnType<typeof createCacheStorage>;
  fetchImpl?: (req: unknown) => Promise<unknown>;
}) {
  const listeners = new Map<string, Listener>();
  const self = {
    location: { origin: ORIGIN },
    addEventListener: (type: string, fn: Listener) => listeners.set(type, fn),
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn(async () => undefined) },
  };
  const fetchImpl = options.fetchImpl ?? (async (req: unknown) => `fetched:${(req as { url: string }).url}`);
  const source = buildSwContent(
    options.manifest ?? [
      { url: '/', revision: 'a' },
      { url: '/index.html', revision: 'a' },
      { url: '/about/index.html', revision: 'b' },
      { url: '/index.pageContext.json', revision: 'c' },
      { url: '/assets/app-123.js', revision: 'd' },
    ],
    options.hash ?? 'new'
  );
  const run = new Function('self', 'caches', 'fetch', 'Response', source);
  run(self, options.caches.api, fetchImpl, Response);

  const dispatch = async (type: string, init: Partial<FakeEvent> = {}) => {
    let responded: Promise<unknown> | undefined;
    let waited: Promise<unknown> | undefined;
    listeners.get(type)!({
      ...init,
      respondWith: (p) => {
        responded = p;
      },
      waitUntil: (p) => {
        waited = p;
      },
    } as FakeEvent);
    if (waited) await waited;
    return responded;
  };
  const fetchEvent = (path: string, mode = 'no-cors', method = 'GET') =>
    dispatch('fetch', { request: { url: ORIGIN + path, method, mode } });

  return { self, dispatch, fetchEvent };
}

describe('generated service worker runtime', () => {
  let caches: ReturnType<typeof createCacheStorage>;

  beforeEach(() => {
    caches = createCacheStorage();
  });

  it('does not skip waiting on install, so open tabs keep their worker', async () => {
    const sw = loadWorker({ caches });
    await sw.dispatch('install');
    expect(sw.self.skipWaiting).not.toHaveBeenCalled();
    expect(caches.store.get('qrcraftly-precache-new')?.has('/about/index.html')).toBe(true);
  });

  it('activates the waiting worker only when the page asks for it', async () => {
    const sw = loadWorker({ caches });
    await sw.dispatch('message', { data: { type: 'OTHER' } });
    expect(sw.self.skipWaiting).not.toHaveBeenCalled();
    await sw.dispatch('message', { data: { type: 'SKIP_WAITING' } });
    expect(sw.self.skipWaiting).toHaveBeenCalledTimes(1);
  });

  it('keeps the current and the previous precache on activate and deletes older ones', async () => {
    caches = createCacheStorage({
      'qrcraftly-precache-old1': { '/assets/app-1.js': 'v1' },
      'qrcraftly-precache-old2': { '/assets/app-2.js': 'v2' },
      'unrelated-cache': { '/x': 'x' },
    });
    // History from two earlier activations.
    const meta = await caches.api.open('qrcraftly-meta');
    await meta.put(
      '/__qrcraftly_cache_history__',
      new Response(JSON.stringify(['qrcraftly-precache-old1', 'qrcraftly-precache-old2']))
    );
    const sw = loadWorker({ caches });
    await sw.dispatch('install');
    await sw.dispatch('activate');

    const names = await caches.api.keys();
    expect(names).toContain('qrcraftly-precache-new');
    expect(names).toContain('qrcraftly-precache-old2');
    expect(names).not.toContain('qrcraftly-precache-old1');
    expect(names).toContain('unrelated-cache');

    // A tab still on the previous build can load its hashed chunk.
    expect(await sw.fetchEvent('/assets/app-2.js')).toBe('v2');
  });

  it('never answers dynamic redirect links or API calls', async () => {
    const sw = loadWorker({ caches });
    await sw.dispatch('install');
    expect(await sw.fetchEvent('/r/abc123', 'navigate')).toBeUndefined();
    expect(await sw.fetchEvent('/r', 'navigate')).toBeUndefined();
    expect(await sw.fetchEvent('/api/redirect/register', 'cors', 'POST')).toBeUndefined();
    expect(await sw.fetchEvent('/api/redirect/abc', 'navigate')).toBeUndefined();
  });

  it('serves precached pages from the cache', async () => {
    const sw = loadWorker({ caches });
    await sw.dispatch('install');
    expect(await sw.fetchEvent('/about', 'navigate')).toBe('network:/about/index.html');
    expect(await sw.fetchEvent('/', 'navigate')).toBe('network:/');
  });

  it('sends unknown navigations to the network instead of serving the homepage', async () => {
    const sw = loadWorker({ caches });
    await sw.dispatch('install');
    expect(await sw.fetchEvent('/does-not-exist', 'navigate')).toBe(`fetched:${ORIGIN}/does-not-exist`);
  });

  it('falls back to the cached shell for unknown navigations only when offline', async () => {
    const sw = loadWorker({
      caches,
      fetchImpl: async () => {
        throw new TypeError('Failed to fetch');
      },
    });
    await sw.dispatch('install');
    expect(await sw.fetchEvent('/does-not-exist', 'navigate')).toBe('network:/');
  });

  it('never substitutes another route for a missing pageContext.json', async () => {
    const sw = loadWorker({ caches });
    await sw.dispatch('install');
    expect(await sw.fetchEvent('/unknown/index.pageContext.json')).toBe(
      `fetched:${ORIGIN}/unknown/index.pageContext.json`
    );
    expect(await sw.fetchEvent('/index.pageContext.json')).toBe('network:/index.pageContext.json');
  });

  it('ignores cross-origin and non-GET requests', async () => {
    const sw = loadWorker({ caches });
    expect(await sw.dispatch('fetch', { request: { url: 'https://example.com/a.js', method: 'GET' } })).toBeUndefined();
    expect(await sw.fetchEvent('/about', 'navigate', 'POST')).toBeUndefined();
  });
});
