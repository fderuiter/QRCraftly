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

import React from 'react';

/**
 * Blank layout wrapper for the Destroy the QR game to isolate it from professional UI shell layouts.
 * @param root0 Component properties
 * @param root0.children Content inside the blank layout
 */
export default function Layout({ children }: { children: React.ReactNode }) {
  return React.createElement(React.Fragment, null, children);
}
