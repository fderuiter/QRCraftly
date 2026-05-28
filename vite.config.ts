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
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import vike from 'vike/plugin';
import { execSync } from 'child_process';

// Compute the application version from git tags
let appVersion = '0.0.0';
try {
  appVersion = execSync('git describe --tags --abbrev=0').toString().trim().replace(/^v/, '');
} catch (e) {
  appVersion = process.env.npm_package_version || '0.0.0';
}

if (!appVersion || appVersion === '') {
  throw new Error('Version injection failed: application version is missing.');
}

/**
 * Vite configuration file.
 * Configures the development server, plugins, environment variables, and path aliases.
 */
export default defineConfig(({ mode }) => {
    // Load environment variables based on the current mode
    loadEnv(mode, '.', '');
    return {
      define: {
        __APP_VERSION__: JSON.stringify(appVersion),
      },
      server: {
        port: 3000,
        host: '0.0.0.0', // Allow access from outside the container
      },
      plugins: [
        react(),
        vike()
      ],
      build: {
        rollupOptions: {
          output: {
          }
        }
      },
      test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './vitest.setup.ts',
        exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        }
      }
    };
});
