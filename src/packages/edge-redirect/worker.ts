/*
    QRCraftly
    Copyright (C) 2025-2026 fderuiter

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

import { routeEdgeRequest } from './lib/router';
import type { WaitUntilContext, WorkerEnv } from './lib/types';

/**
 * Cloudflare Worker entry (the `main` of wrangler.jsonc once dynamic redirects
 * are enabled; see docs/public/EDGE_ARCHITECTURE.md). Static assets that match
 * a file are served by the platform before this code runs; everything else
 * lands here and is routed to the redirect API, the `/r/<id>` resolver shell,
 * or back to the assets binding.
 */
export default {
  fetch(request: Request, env: WorkerEnv, ctx: WaitUntilContext): Promise<Response> {
    return routeEdgeRequest(request, env, ctx);
  },
};
