import { test, expect } from './fixtures';

test.describe('Context-Level Network Routing & Worker Interception', () => {
  test.beforeEach(async ({ page, context }) => {
    // Dynamically serve the temp-test-worker.js script using Playwright routing to bypass any disk/server issues
    await context.route('**/assets/temp-test-worker.js', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `
          self.onmessage = async () => {
            console.log('Worker started inside the worker thread');
            try {
              const res = await fetch('/unauthorized/test');
              self.postMessage({ status: 'success', statusText: res.statusText });
            } catch (e) {
              console.error('Worker fetch failed:', e.message);
              self.postMessage({ status: 'error', message: e.message });
            }
          };
        `
      });
    });

    page.on('console', msg => console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.error(`[Browser PageError] ${err.message}`));
    
    await page.goto('/');
    await page.waitForSelector('main[data-hydrated="true"]');
  });

  test('should allow authorized localhost requests', async ({ page }) => {
    // Normal local requests (e.g. to our dev server) should pass
    const isLocalOk = await page.evaluate(async () => {
      try {
        const res = await fetch('/');
        return res.status === 200;
      } catch {
        return false;
      }
    });
    expect(isLocalOk).toBe(true);
  });

  test('should block unauthorized external requests from the page and register a failure', async ({ page }) => {
    // This test is expected to fail because the unauthorized fetch will be blocked
    // and push an error to testInfo.errors.
    test.fail(true, 'Expected to fail due to unauthorized external request from the page');

    await page.evaluate(async () => {
      await fetch('/unauthorized/test');
    });
  });

  test('should block unauthorized external requests from a Web Worker and register a failure', async ({ page }) => {
    // This test is expected to fail because the Web Worker's fetch will be blocked
    // by our context-level interceptor and register a test failure.
    test.fail(true, 'Expected to fail due to unauthorized external request from Web Worker');

    await page.evaluate(async () => {
      const worker = new Worker('/assets/temp-test-worker.js');
      
      const responsePromise = new Promise((resolve) => {
        worker.onmessage = (e) => resolve(e.data);
        worker.onerror = (e) => resolve({ status: 'error', message: e.message });
      });

      worker.postMessage('start');

      const result = await responsePromise;
      console.log('Worker Result:', result);
      
      // Wait another 500ms to let the Node.js event loop process the route interception completely
      await new Promise(resolve => setTimeout(resolve, 500));
    });
  });
});
