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
  prerender: true,

  lang: 'en',

  // Register custom config for Open Graph images
  // https://vike.dev/meta
  meta: {
    image: {
      env: { server: true, client: true }
    },
    imageAlt: {
      env: { server: true, client: true }
    }
  }
} satisfies Config;
