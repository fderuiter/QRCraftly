import vikeReact from 'vike-react/config';
import type { Config } from 'vike/types';
import Head from '@/layouts/Head';
import Layout from '@/layouts/LayoutDefault';

// Default config (can be overridden by pages)
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
