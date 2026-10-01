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

import { QRType } from '@/types';

/**
 * One destination in the site-wide primary navigation.
 */
export interface PrimaryNavItem {
  /** Stable identifier. */
  id: 'create' | 'transfer' | 'arcade' | 'about' | 'security';
  /** Visible label, identical on every route family. */
  label: string;
  /** Destination path. */
  href: string;
  /** Marks a feature that is still in beta. */
  beta?: boolean;
}

/**
 * Canonical route for each QR type's generator page. The type selector links to these,
 * so the URL, metadata and the selected type always come from the same route.
 */
export const QR_TYPE_ROUTES: Record<QRType, string> = {
  [QRType.URL]: '/',
  [QRType.TEXT]: '/text-qr-code',
  [QRType.WIFI]: '/wifi-qr-code',
  [QRType.EVENT]: '/event-qr-code',
  [QRType.VCARD]: '/vcard-qr-code',
  [QRType.EMAIL]: '/email-qr-code',
  [QRType.PHONE]: '/phone-qr-code',
  [QRType.SMS]: '/sms-qr-code',
  [QRType.PAYMENT]: '/payment-qr-code',
  [QRType.LOCATION]: '/location-qr-code',
  [QRType.MEETING]: '/meeting-qr-code',
  [QRType.SOCIAL]: '/social-qr-code',
};

/**
 * The single primary-navigation data model shared by the product shell, the generator
 * and the file-transfer sender and receiver. It feeds both the inline desktop links and the
 * narrow-layout drawer.
 */
export const PRIMARY_NAV_ITEMS: readonly PrimaryNavItem[] = [
  { id: 'create', label: 'Create QR', href: '/' },
  { id: 'transfer', label: 'File Transfer', href: '/file-transfer', beta: true },
  { id: 'arcade', label: 'Arcade', href: '/arcade' },
  { id: 'about', label: 'About', href: '/about' },
  { id: 'security', label: 'Security', href: '/security' },
];

const GENERATOR_PATHS = new Set<string>(Object.values(QR_TYPE_ROUTES));

/**
 * Normalises a pathname: strips query/hash and any trailing slash (except for `/`).
 * @param pathname - Raw pathname.
 * @returns The normalised pathname.
 */
export function normalizePathname(pathname: string): string {
  const bare = pathname.split(/[?#]/)[0] || '/';
  return bare.length > 1 ? bare.replace(/\/+$/, '') || '/' : bare;
}

/**
 * Finds the primary destination that owns a pathname, so it can be marked with
 * `aria-current="page"`. Every generator route belongs to "Create QR", and both
 * `/file-transfer` and `/file-transfer/receive` belong to "File Transfer".
 * @param pathname - The current pathname.
 * @returns The owning item's id, or undefined when no primary destination matches.
 */
export function getCurrentPrimaryNavId(pathname: string): PrimaryNavItem['id'] | undefined {
  const path = normalizePathname(pathname);
  if (GENERATOR_PATHS.has(path)) return 'create';
  if (path === '/file-transfer' || path === '/file-transfer/receive') return 'transfer';
  return PRIMARY_NAV_ITEMS.find((item) => item.href === path)?.id;
}
