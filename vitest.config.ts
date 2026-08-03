import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  },
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'unit-logic',
          environment: 'node',
          setupFiles: [],
          include: [
            'src/**/*.test.{ts,tsx}',
            'tests/**/*.test.{ts,tsx}',
          ],
          exclude: [
            '**/*.test.tsx',
            'src/hooks/**/*.test.ts',
            'src/utils/useQRDownload.test.ts',
            'src/utils/hooks.test.ts',
            'src/utils/scannabilityWorker.test.ts',
            'src/utils/qrRenderer.test.ts',
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
          include: [
            '**/*.test.tsx',
            'src/hooks/**/*.test.ts',
            'src/utils/useQRDownload.test.ts',
            'src/utils/hooks.test.ts',
            'src/utils/scannabilityWorker.test.ts',
            'src/utils/qrRenderer.test.ts',
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
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
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
        'src/utils/useQRDownload.ts',
      ],
    }
  }
});
