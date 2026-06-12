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

import QRTool from '@/components/QRTool';
import { DEFAULT_CONFIG } from '@/constants';
import { QRType } from '@/types';
import { contentRegistry } from '@/data/contentRegistry';
import { generateSchema } from '@/utils/schemaGenerator';
import { resolveDomainForPath } from '@/utils/metadataEngine';
import { safeJsonLdStringify } from '@/utils/security';
import { usePageContext } from 'vike-react/usePageContext';

/**
 * WiFi QR Code Page Component
 *
 * A specialized landing page that pre-configures the `QRTool` for WiFi QR code generation.
 * This can be used for SEO landing pages or direct links to specific functionality.
 *
 * @returns {JSX.Element} The WiFi QR code page layout.
 */
export default function Page() {
  const pageContext = usePageContext();
  const resolvedDomain = resolveDomainForPath(pageContext.urlPathname);
  const wifiConfig = {
    ...DEFAULT_CONFIG,
    type: QRType.WIFI,
  };

  const schemaData = generateSchema(contentRegistry['wifi-qr-code'], resolvedDomain);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(schemaData) }} />
      <QRTool initialConfig={wifiConfig} title="WiFi QR Code"  toolId="wifi-qr-code" />
          </>
  );
}
