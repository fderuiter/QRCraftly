import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use) => {
    // Intercept and block any unmocked physical network packets initiated during user actions
    await page.route('**/*', (route) => {
      const url = route.request().url();
      
      const isAllowed = (u: string) => {
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
        console.warn(`Blocked unauthorized external request: ${url}`);
        route.abort('failed');
      }
    });

    await use(page);
  },
});

export { expect };
