import { test as base, expect } from '@playwright/test';

export interface PerfMonitor {
  setupCpuThrottling(rate: number): Promise<void>;
  startMonitoring(): Promise<void>;
  clearLongTasks(): Promise<void>;
  getLongTasks(): Promise<Array<{ name: string; startTime: number; duration: number }>>;
  getHardwareScaleFactor(): number;
}

let cachedScaleFactor: number | null = null;

export const getHardwareScaleFactor = (): number => {
  if (cachedScaleFactor !== null) {
    return cachedScaleFactor;
  }
  const start = Date.now();
  let x = 0;
  for (let i = 0; i < 1000000; i++) {
    x += Math.sin(i) * Math.cos(i);
  }
  const duration = Date.now() - start;
  // On a fast reference machine, 1,000,000 iterations of sin/cos takes ~8ms.
  // We calibrate the scale factor relative to that.
  cachedScaleFactor = Math.max(1.0, duration / 8.0);
  console.log(`[Perf Calibration] Hardware benchmark duration: ${duration}ms. Scale factor: ${cachedScaleFactor.toFixed(2)}x`);
  return cachedScaleFactor;
};

export const test = base.extend<{ perfMonitor: PerfMonitor }>({
  perfMonitor: async ({ page }, use) => {
    let client: any = null;

    const monitor: PerfMonitor = {
      async setupCpuThrottling(rate: number) {
        if (!client) {
          client = await page.context().newCDPSession(page);
        }
        await client.send('Emulation.setCPUThrottlingRate', { rate });
      },
      async startMonitoring() {
        await page.addInitScript(() => {
          (window as any).isPerformanceTest = true;
          (window as any).longTasks = [];
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              (window as any).longTasks.push({
                name: entry.name,
                startTime: entry.startTime,
                duration: entry.duration,
              });
            }
          });
          observer.observe({ entryTypes: ['longtask'] });
        });
      },
      async clearLongTasks() {
        await page.evaluate(() => {
          (window as any).longTasks = [];
        });
      },
      async getLongTasks() {
        return await page.evaluate(() => {
          return (window as any).longTasks || [];
        });
      },
      getHardwareScaleFactor() {
        return getHardwareScaleFactor();
      }
    };

    await use(monitor);
  },

  page: async ({ page, context }, use, testInfo) => {
    const blockedRequests: string[] = [];

    // Intercept and block any unmocked physical network packets initiated during user actions
    // at the browser-context level (to cover both pages and background web workers)
    await context.route('**/*', (route) => {
      const url = route.request().url();
      
      const isAllowed = (u: string) => {
        if (u.includes('unauthorized')) {
          return false;
        }
        // relative URLs or protocols that are not http/https
        if (!u.startsWith('http://') && !u.startsWith('https://')) {
          return true;
        }
        try {
          const parsed = new URL(u);
          const hostname = parsed.hostname.toLowerCase();
          return (
            hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname === '0.0.0.0' ||
            hostname.endsWith('.localhost')
          );
        } catch {
          return true;
        }
      };

      if (isAllowed(url)) {
        route.continue();
      } else {
        const type = route.request().resourceType();
        const errorMsg = `Blocked unauthorized external request: ${url} (type: ${type})`;
        console.warn(errorMsg);
        
        if (type === 'fetch' || type === 'websocket' || type === 'xmlhttprequest') {
          // Do not fail tests on blocked external font requests
          let isFontUrl = false;
          try {
            const parsed = new URL(url);
            const hostname = parsed.hostname.toLowerCase();
            if (hostname === 'fonts.googleapis.com' || hostname === 'fonts.gstatic.com') {
              isFontUrl = true;
            }
          } catch {
            // Treat as not a font URL if it fails to parse
          }

          if (!isFontUrl) {
            blockedRequests.push(url);
          }
        }
        
        route.abort('failed');
      }
    });

    await use(page);

    // Enforce strict client-side data privacy boundaries by failing the test if any request was blocked
    console.log(`[Teardown] Blocked requests count: ${blockedRequests.length}`, blockedRequests);
    if (blockedRequests.length > 0) {
      const errorMsg = `Blocked unauthorized external request(s):\n${blockedRequests.map(r => `  - ${r}`).join('\n')}`;
      testInfo.errors.push(new Error(errorMsg));
      throw new Error(errorMsg);
    }
  },
});

export { expect };
