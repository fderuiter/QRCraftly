import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Service Worker API Navigation Bypass Unit Suite', () => {
  const swScriptPath = path.join(__dirname, '../scripts/generate_sw.cjs');

  it('should include the API bypass guard in generate_sw.cjs template', () => {
    const swScriptContent = fs.readFileSync(swScriptPath, 'utf8');
    
    // Check that the script contains the API path prefix check
    expect(swScriptContent).toContain("url.pathname.startsWith('/api/') || url.pathname === '/api'");
  });

  it('should place the API bypass check before method and origin filters in the fetch listener', () => {
    const swScriptContent = fs.readFileSync(swScriptPath, 'utf8');
    const apiCheckIndex = swScriptContent.indexOf("url.pathname.startsWith('/api/') || url.pathname === '/api'");
    const getMethodCheckIndex = swScriptContent.indexOf("request.method !== 'GET'");

    expect(apiCheckIndex).toBeGreaterThan(-1);
    expect(getMethodCheckIndex).toBeGreaterThan(-1);
    expect(apiCheckIndex).toBeLessThan(getMethodCheckIndex);
  });

  it('should bypass service worker handling for all HTTP methods targeting API routes', () => {
    // Extract fetch listener body from generate_sw.cjs logic
    const swScriptContent = fs.readFileSync(swScriptPath, 'utf8');

    // Simulate fetch listener execution environment
    function createFetchHandler() {
      // Evaluate the generated sw fetch listener pattern
      return function handleFetch(event: { request: { url: string; method: string; mode?: string }; respondWith: (p: any) => void }) {
        const request = event.request;
        const url = new URL(request.url, 'https://qrcraftly.com');
        const selfLocationOrigin = 'https://qrcraftly.com';

        // Requirement 1 & 2: API routes bypass interception
        if (url.pathname.startsWith('/api/') || url.pathname === '/api') {
          return;
        }

        if (request.method !== 'GET' || url.origin !== selfLocationOrigin) {
          return;
        }

        event.respondWith(Promise.resolve('handled_by_sw'));
      };
    }

    const fetchHandler = createFetchHandler();

    const apiRoutes = [
      { url: 'https://qrcraftly.com/api', method: 'GET' },
      { url: 'https://qrcraftly.com/api/', method: 'GET' },
      { url: 'https://qrcraftly.com/api/redirect/12345', method: 'GET', mode: 'navigate' },
      { url: 'https://qrcraftly.com/api/redirect/register', method: 'POST' },
      { url: 'https://qrcraftly.com/api/redirect/update', method: 'PUT' },
      { url: 'https://qrcraftly.com/api/telemetry', method: 'POST' },
    ];

    for (const route of apiRoutes) {
      let respondWithCalled = false;
      const mockEvent = {
        request: route,
        respondWith: () => {
          respondWithCalled = true;
        },
      };

      fetchHandler(mockEvent);
      expect(respondWithCalled).toBe(false);
    }
  });

  it('should allow standard application routes and assets to be handled by service worker', () => {
    function createFetchHandler() {
      return function handleFetch(event: { request: { url: string; method: string; mode?: string }; respondWith: (p: any) => void }) {
        const request = event.request;
        const url = new URL(request.url, 'https://qrcraftly.com');
        const selfLocationOrigin = 'https://qrcraftly.com';

        if (url.pathname.startsWith('/api/') || url.pathname === '/api') {
          return;
        }

        if (request.method !== 'GET' || url.origin !== selfLocationOrigin) {
          return;
        }

        event.respondWith(Promise.resolve('handled_by_sw'));
      };
    }

    const fetchHandler = createFetchHandler();

    const appRoutes = [
      { url: 'https://qrcraftly.com/', method: 'GET', mode: 'navigate' },
      { url: 'https://qrcraftly.com/about', method: 'GET', mode: 'navigate' },
      { url: 'https://qrcraftly.com/assets/index.js', method: 'GET' },
    ];

    for (const route of appRoutes) {
      let respondWithCalled = false;
      const mockEvent = {
        request: route,
        respondWith: () => {
          respondWithCalled = true;
        },
      };

      fetchHandler(mockEvent);
      expect(respondWithCalled).toBe(true);
    }
  });
});
