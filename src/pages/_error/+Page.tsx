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

/**
 * 404 Error Page Component
 *
 * Renders a user-friendly error message when a requested page is not found.
 * Provides a link to navigate back to the home page.
 *
 * @returns {JSX.Element} The error page layout.
 */
export default function Page() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-700">
      <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
      <p className="mb-8">The page you are looking for does not exist.</p>
      <a href="/" className="px-4 py-2 bg-teal-700 text-white rounded hover:bg-teal-800 transition-colors">
        Go Home
      </a>
    </div>
  );
}
