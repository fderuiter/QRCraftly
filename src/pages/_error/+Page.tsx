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

import { usePageContext } from 'vike-react/usePageContext';
import { ProductShell } from '@/components/ProductShell';

/**
 * Error Page Component
 *
 * Renders a user-friendly error message when a requested page is not found
 * or when an internal server error occurs.
 * @returns The error page layout.
 */
export default function Page() {
  const pageContext = usePageContext();
  const is404 = (pageContext as any).is404;

  return (
    <ProductShell>
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center text-slate-700 dark:text-slate-200">
      {is404 ? (
        <>
          <h1 className="mb-4 text-4xl font-bold">404 - Page Not Found</h1>
          <p className="mb-8">The page you are looking for does not exist.</p>
        </>
      ) : (
        <>
          <h1 className="mb-4 text-4xl font-bold">500 - Internal Server Error</h1>
          <p className="mb-8">Something went wrong on our end.</p>
        </>
      )}
      <a href="/" className="rounded bg-teal-700 px-4 py-2 text-white transition-colors hover:bg-teal-800">
        Go Home
      </a>
    </div>
    </ProductShell>
  );
}
