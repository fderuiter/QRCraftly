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

import React from 'react';

import QRTool from '@/components/QRTool';
import { DEFAULT_CONFIG } from '@/constants';
import { QRType } from '@/types';
import { safeJsonLdStringify } from '@/utils/security';

interface QRTypePageProps {
  /** The QR code type to pre-select. */
  type: QRType;
  /** The title to display in the QRTool header. */
  title: string;
  /** The structured data (JSON-LD) object to inject. */
  schemaData: any;
  /** The tool ID for loading content. */
  toolId: string;
}

/**
 * A reusable page component for specific QR code type landing pages.
 * It sets up the QRTool with the correct type and injects the provided schema.org data.
 */
export const QRTypePage: React.FC<QRTypePageProps> = ({ type, title, schemaData, toolId }) => {
  const config = {
    ...DEFAULT_CONFIG,
    type,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(schemaData) }} />
      <QRTool initialConfig={config} title={title} toolId={toolId} />
    </>
  );
};

