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

import { SocialData, SocialPlatform } from '../../types';

/**
 * Sanitizes a social media handle by stripping characters that could be used
 * to inject path segments or query parameters into a constructed URL.
 *
 * Allows: alphanumeric characters, underscores, hyphens, and periods.
 * Strips: slashes, query/hash chars, control characters, and whitespace.
 */
export const sanitizeSocialHandle = (handle: string): string => {
  // Strip leading '@' as it is a display convention, not part of the URL path
  const withoutAt = handle.replace(/^@+/, '');
  // Allow only characters that are valid in a URL path segment for a username
  return withoutAt.replace(/[^a-zA-Z0-9_.\-]/g, '');
};

const SOCIAL_PLATFORM_URLS: Record<SocialPlatform, (handle: string) => string> = {
  [SocialPlatform.INSTAGRAM]: (handle) => `https://instagram.com/${handle}`,
  [SocialPlatform.TWITTER]: (handle) => `https://x.com/${handle}`,
  [SocialPlatform.TIKTOK]: (handle) => `https://tiktok.com/@${handle}`,
};

/**
 * Constructs a standard HTTPS social media profile URL from the given data.
 *
 * Uses Universal Links (HTTPS) so modern mobile operating systems automatically
 * route to the installed native app when available, with a web browser fallback.
 *
 * @param data - The social data containing the platform and handle.
 * @returns A full HTTPS profile URL, or an empty string if the handle is empty.
 */
export const constructSocialString = (data: SocialData): string => {
  const cleanHandle = sanitizeSocialHandle(data.handle);
  if (!cleanHandle) return '';

  const constructUrl = SOCIAL_PLATFORM_URLS[data.platform];
  return constructUrl ? constructUrl(cleanHandle) : '';
};
