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

import React, { Suspense, useEffect, useState } from 'react';
import type { BulkCsvInputProps } from './BulkCsvInput';

// Code-split: the CSV parser, ZIP writer and batch UI load only when the Bulk CSV
// type is opened, so every other page keeps its JavaScript budget.
const BulkCsvInput = React.lazy(() =>
  import('./BulkCsvInput').then((module) => ({ default: module.BulkCsvInput }))
);

const Placeholder = () => (
  <div
    aria-hidden="true"
    className="h-48 rounded-xl bg-slate-100 motion-safe:animate-pulse dark:bg-slate-800"
  />
);

/**
 * Registry entry for the Bulk CSV Batch type. Renders a placeholder during
 * prerendering and hydration, then loads the batch generator chunk on the client.
 */
export const LazyBulkCsvInput: React.FC<BulkCsvInputProps> = (props) => {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return <Placeholder />;
  return (
    <Suspense fallback={<Placeholder />}>
      <BulkCsvInput {...props} />
    </Suspense>
  );
};
