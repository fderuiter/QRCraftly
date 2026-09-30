/*
    QRCraftly
    Copyright (C) 2025 fderuiter

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import vike from 'vike/plugin';
import type { Plugin } from 'vite';
import { createDevRedirectMiddleware } from './src/packages/edge-redirect/dev';

/**
 * Serves `/api/redirect/*` from an in-memory mock D1 during `pnpm dev`, so dynamic
 * links can be created and resolved locally without Cloudflare credentials (#928).
 * Production uses the Worker entry `src/packages/edge-redirect/worker.ts`.
 */
const devRedirectApi = (): Plugin => ({
  name: 'qrcraftly:dev-redirect-api',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use(createDevRedirectMiddleware());
  },
});

/**
 * Vite configuration file.
 * Configures the development server, plugins, environment variables, and path aliases.
 */
export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0', // Allow access from outside the container
      },
      preview: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        vike(),
        devRedirectApi(),
      ],
      esbuild: {
        target: 'es2022'
      },
      optimizeDeps: {
        esbuildOptions: {
          target: 'es2022'
        }
      },
      build: {
        target: "es2022",
        rollupOptions: {}
      },
      test: {
        globals: true,
        testTimeout: 15000,
        server: {
          deps: {
            inline: ['jsqr'],
          },
        },
        projects: [
          {
            extends: true,
            test: {
              name: 'unit-logic',
              environment: 'node',
              include: [
                'src/**/*.test.{ts,tsx}',
                'tests/**/*.test.{ts,tsx}',
              ],
              exclude: [
                '**/*.test.tsx',
                'src/hooks/**/*.test.ts',
                'tests/scannabilityWorker.test.ts',
                'src/utils/matrixWorker.test.ts',
                'src/utils/mazeWorker.test.ts',
                'src/utils/qrRenderer.test.ts',
                'tests/opticalTransferSliceWorker.test.ts',
                'tests/telemetry.test.ts',
                '**/node_modules/**',
                '**/dist/**',
                'e2e/**',
              ],
            },
          },
          {
            extends: true,
            test: {
              name: 'browser-ui',
              environment: 'jsdom',
              setupFiles: ['./vitest.setup.ts'],
              server: {
                deps: {
                  inline: ['jsqr'],
                },
              },
              include: [
                '**/*.test.tsx',
                'src/hooks/**/*.test.ts',
                'tests/scannabilityWorker.test.ts',
                'src/utils/matrixWorker.test.ts',
                'src/utils/mazeWorker.test.ts',
                'src/utils/qrRenderer.test.ts',
                'tests/opticalTransferSliceWorker.test.ts',
                'tests/telemetry.test.ts',
              ],
              exclude: [
                '**/node_modules/**',
                '**/dist/**',
                'e2e/**',
              ],
            },
          },
        ],
        coverage: {
          reporter: ['text', 'json-summary', 'json'],
          reportOnFailure: true,
          // Floors set just under the measured totals for the scope below; raise
          // them as coverage improves, never lower them to make a PR pass.
          thresholds: {
            // Measured on dev when this scope was introduced: statements 80.4%,
            // branches 73.1%, functions 86.1%, lines 81.4%.
            statements: 80,
            branches: 72,
            functions: 85,
            lines: 80,
          },
          // Measure the logic layers: shared utilities, the deep-module packages
          // and the Cloudflare Pages Functions. Components, hooks and pages are
          // exercised by the jsdom project and Playwright but not gated here.
          include: [
            'src/utils/**/*.ts',
            'src/packages/**/*.ts',
            'functions/**/*.ts',
          ],
          exclude: [
            '**/*.test.ts',
            '**/*.d.ts',
          ],
        }
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        }
      }
    };
});
