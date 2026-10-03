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

/**
 * Removes every network loader from the zxing-wasm glue at build time (ADR 0023).
 *
 * zxing-wasm's Emscripten glue can fetch its `.wasm` (with `fetch`, or a synchronous
 * `XMLHttpRequest` in workers) and defaults to a jsDelivr URL. QRCraftly never lets it: the main
 * thread compiles the reader from our own origin and the worker instantiates that module through
 * `instantiateWasm`. This plugin replaces the glue's loaders with a function that throws, so the
 * scanner worker contains no network code at all and `scripts/bundle_ast_audit.js` needs no
 * exemption for it.
 *
 * Each replacement must match exactly the expected number of times; a zxing-wasm upgrade that
 * changes the glue fails the build here instead of shipping a loader we did not review.
 */
import type { Plugin } from 'vite';

/** One rewrite of a zxing-wasm module: what to replace and how many times it must occur. */
interface Rewrite {
  /** The module, by the end of its resolved path (POSIX separators). */
  file: string;
  pattern: RegExp;
  replacement: string;
  count: number;
}

const NO_NETWORK = '__qrcraftlyNoNetwork';

export const ZXING_REWRITES: readonly Rewrite[] = [
  // `fetch(url, { credentials: "same-origin" })`: the async loader and the streaming compile.
  { file: 'zxing-wasm/dist/es/reader/index.js', pattern: /\bfetch\(/g, replacement: `${NO_NETWORK}(`, count: 2 },
  // The synchronous loader used in workers.
  {
    file: 'zxing-wasm/dist/es/reader/index.js',
    pattern: /new XMLHttpRequest\(\)/g,
    replacement: `${NO_NETWORK}()`,
    count: 1,
  },
  // The default `locateFile` points at a CDN; without it the file name resolves against our origin.
  {
    file: 'zxing-wasm/dist/es/share.js',
    pattern: /`https:\/\/fastly\.jsdelivr\.net\/npm\/zxing-wasm@[^`]*`/g,
    replacement: 't + e',
    count: 1,
  },
];

const STUB = `const ${NO_NETWORK} = () => { throw new Error('zxing-wasm network loading is disabled in QRCraftly'); };\n`;

/**
 * Applies {@link ZXING_REWRITES} to one module's source.
 * @param id The module id (resolved path).
 * @param code The module source.
 * @returns The rewritten source, or null when the module is not a zxing-wasm glue file.
 */
export function rewriteZxingModule(id: string, code: string): string | null {
  const path = id.split('?')[0].replace(/\\/g, '/');
  const rewrites = ZXING_REWRITES.filter((rewrite) => path.endsWith(`/${rewrite.file}`));
  if (rewrites.length === 0) return null;
  let out = code;
  for (const rewrite of rewrites) {
    const found = out.match(rewrite.pattern)?.length ?? 0;
    if (found !== rewrite.count) {
      throw new Error(
        `zxing-no-network: expected ${rewrite.count} match(es) of ${rewrite.pattern} in ${rewrite.file}, found ${found}. ` +
          'Review the zxing-wasm glue after an upgrade and update scripts/vite/zxingNoNetwork.ts.'
      );
    }
    out = out.replace(rewrite.pattern, rewrite.replacement);
  }
  return out.includes(NO_NETWORK) ? STUB + out : out;
}

/** The Vite plugin. Add it to both the app and the worker plugin lists. */
export function zxingNoNetwork(): Plugin {
  return {
    name: 'qrcraftly:zxing-no-network',
    enforce: 'pre',
    transform(code, id) {
      const rewritten = rewriteZxingModule(id, code);
      return rewritten === null ? null : { code: rewritten, map: null };
    },
  };
}
