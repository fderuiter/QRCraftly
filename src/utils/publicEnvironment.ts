/*
    QRCraftly
    Copyright (C) 2026 fderuiter

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

const DEFAULT_PUBLIC_DOMAIN = 'https://qrcraftly.com';

interface PublicEnvironment {
  viteDomain: string | undefined;
  nodeProcess: { env?: { VITE_DOMAIN?: string } } | undefined;
}

/**
 * Reads the public domain without assuming that either browser or Node globals exist.
 *
 * Vite replaces the direct `import.meta.env.VITE_DOMAIN` access in browser bundles.
 * The guarded Node fallback supports scripts that import the shared metadata helpers.
 *
 * @returns The configured public domain, or the production domain by default.
 */
export const getConfiguredPublicDomain = (environment?: PublicEnvironment): string => {
  const viteDomain = environment
    ? environment.viteDomain
    : import.meta.env.VITE_DOMAIN;
  const nodeProcess = environment
    ? environment.nodeProcess
    : typeof process !== 'undefined'
      ? process
      : undefined;
  const nodeDomain = nodeProcess?.env?.VITE_DOMAIN;

  return viteDomain || nodeDomain || DEFAULT_PUBLIC_DOMAIN;
};
