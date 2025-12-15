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
      build: {
        rollupOptions: {
          output: {
            // Vike requires manualChunks to be a function
            manualChunks: (id) => {
              if (id.includes('node_modules')) {
                if (id.includes('react') || id.includes('react-dom')) {
                  return 'vendor-react';
                }
                if (id.includes('vike') || id.includes('vike-react')) {
                  return 'vendor-vike';
                }
                if (id.includes('lucide-react') || id.includes('qrcode')) {
                  return 'vendor-utils';
                }
                // Determine other vendor chunks if necessary, or let Vite handle the rest
              }
            }
          }
        }
      },
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
