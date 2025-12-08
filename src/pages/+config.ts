import vikeReact from 'vike-react/config';
import type { Config } from 'vike/types';
import Head from '@/layouts/Head';
import Layout from '@/layouts/LayoutDefault';

// Default config (can be overridden by pages)
/**
 * Global Vike Configuration
 *
 * Defines the default layout, head component, and Vike settings for the application.
 * Enabling prerendering for Static Site Generation (SSG).
 */
export default {
  // https://vike.dev/Layout
  Layout,

  // https://vike.dev/Head
  Head,

  // https://vike.dev/extends
  extends: vikeReact,

  // https://vike.dev/prerender
  prerender: true
} satisfies Config;
