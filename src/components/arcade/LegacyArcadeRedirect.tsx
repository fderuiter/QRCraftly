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

import React, { useEffect } from 'react';
import { navigate } from 'vike/client/router';
import { ProductShell } from '@/components/ProductShell';
import { isDangerousUrl } from '@/utils/security';

/**
 * Client-side redirect from a retired game route to its QR Arcade mode. The static page also
 * carries a meta refresh (see the route's +Head) so it works without JavaScript.
 * @param root0 - Component properties.
 * @param root0.to - Destination, such as `/arcade?mode=blaster`.
 * @returns A short "moved" notice with a manual link.
 */
export function LegacyArcadeRedirect({ to }: { to: string }) {
  useEffect(() => {
    Promise.resolve(navigate(to, { overwriteLastHistoryEntry: true })).catch(() => {
      window.location.replace(to);
    });
  }, [to]);

  let link: React.ReactNode = null;
  if (!isDangerousUrl(to)) {
    link = (
      <a href={to} className="mt-6 inline-block font-semibold text-accent underline underline-offset-4">
        Open the QR Arcade
      </a>
    );
  }

  return (
    <ProductShell>
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-fg">This game now lives in the QR Arcade</h1>
        <p className="mt-3 text-fg-muted">Taking you there now.</p>
        {link}
      </div>
    </ProductShell>
  );
}

/**
 * Head tags for a legacy route: an instant meta refresh for visitors without JavaScript and
 * `noindex` so search engines keep only the canonical /arcade page.
 * @param root0 - Component properties.
 * @param root0.to - Destination.
 * @returns The head tags.
 */
export function LegacyArcadeRedirectHead({ to }: { to: string }) {
  return (
    <>
      <meta httpEquiv="refresh" content={`0; url=${to}`} />
      <meta name="robots" content="noindex, follow" />
    </>
  );
}
