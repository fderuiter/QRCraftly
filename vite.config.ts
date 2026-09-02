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
        vike()
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
                'src/utils/scannabilityWorker.test.ts',
                'src/utils/matrixWorker.test.ts',
                'src/utils/mazeWorker.test.ts',
                'src/utils/qrRenderer.test.ts',
                'src/utils/fileSliceWorker.test.ts',
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
                'src/utils/scannabilityWorker.test.ts',
                'src/utils/matrixWorker.test.ts',
                'src/utils/mazeWorker.test.ts',
                'src/utils/qrRenderer.test.ts',
                'src/utils/fileSliceWorker.test.ts',
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
          thresholds: {
            statements: 81,
            branches: 80,
            functions: 89,
            lines: 81,
          },
          include: [
            'src/utils/*.ts',
            'src/utils/qr-generators/*.ts',
            'src/utils/qr-renderers/*.ts'
          ],
          exclude: [
            'src/utils/svgContext.ts',
            'src/utils/svgExport.ts',
            'src/utils/templateRenderer.ts',
            'src/utils/AdaptiveFrameScheduler.ts',
            'src/utils/a11y.ts',
            'src/utils/assetCache.ts',
            'src/utils/contrastAudit.ts',
            'src/utils/exportRiskPolicy.ts',
            'src/utils/fileReassemblyWorker.ts',
            'src/utils/fileSliceWorker.ts',
            'src/utils/FrameProvider.ts',
            'src/utils/imageResizeHelper.ts',
            'src/utils/imageResizeWorker.ts',
            'src/utils/matrixWorker.ts',
            'src/utils/mazeContract.ts',
            'src/utils/mazeWorker.ts',
            'src/utils/metadataEngine.ts',
            'src/utils/notificationStyles.ts',
            'src/utils/opticalSimulation.ts',
            'src/utils/publicEnvironment.ts',
            'src/utils/protocol.ts',
            'src/utils/qrRenderer.ts',
            'src/utils/scannabilityChecker.ts',
            'src/utils/scannabilityWorker.ts',
            'src/utils/scannerContract.ts',
            'src/utils/schemaGenerator.ts',
            'src/utils/security.ts',
            'src/utils/sharedContract.ts',
            'src/utils/sharedScannerWorker.ts',
            'src/utils/contrastAudit.ts',
            'src/utils/exportRiskPolicy.ts',
            'src/utils/opticalSimulation.ts',
            'src/utils/qrRenderer.ts',
            'src/utils/qr-generators/email.ts',
            'src/utils/qr-generators/event.ts',
            'src/utils/qr-generators/sms.ts',
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
