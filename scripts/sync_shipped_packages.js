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

// Rewrites scripts/vite/shipped-packages.json from a fresh client build, listing every
// third-party package that ships to the browser. See scripts/vite/thirdPartyLicenses.ts.
import { execBinary } from './utils/execHelper.js';

execBinary('pnpm', ['exec', 'vite', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, QRCRAFTLY_SYNC_SHIPPED_PACKAGES: '1' },
});
