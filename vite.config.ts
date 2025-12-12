import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import vike from 'vike/plugin';

/**
 * Vite configuration file.
 * Configures the development server, plugins, environment variables, and path aliases.
 */
export default defineConfig(({ mode }) => {
    // Load environment variables based on the current mode
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0', // Allow access from outside the container
      },
      plugins: [
        react(),
        vike()
      ],
      test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './vitest.setup.ts',
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        }
      }
    };
});
