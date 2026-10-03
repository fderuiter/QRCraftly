import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.resolve(__dirname, '../dist/client');
export const MAX_GZIPPED_SIZE_KB = 775;
// The scanner's zxing-wasm reader (ADR 0023) is fetched only when someone scans and is never
// precached, so it has its own budget instead of counting against the site's.
export const MAX_LAZY_WASM_GZIPPED_SIZE_KB = 450;

/**
 * Whether a file is the lazily loaded WebAssembly reader, budgeted separately.
 * @param {string} relativePath
 * @returns {boolean}
 */
export function isLazyWasm(relativePath) {
  return relativePath.endsWith('.wasm');
}

/**
 * Recursively gets all file paths in a directory.
 * @param {string} dir 
 * @returns {string[]}
 */
export function getFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getFiles(fullPath));
    } else if (stat.isFile()) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Calculates raw and gzipped sizes of all files in a directory.
 * The lazily loaded `.wasm` reader is reported but counted against its own budget.
 * @param {string} distDir 
 * @param {number} limitKb 
 * @param {number} [wasmLimitKb]
 * @returns {{totalRawSize: number, totalGzipSize: number, limitBytes: number, wasmGzipSize: number, wasmLimitBytes: number, reports: Array<{path: string, rawSize: number, gzipSize: number}>, exceeds: boolean, wasmExceeds: boolean}}
 */
export function verifyBundleSize(distDir, limitKb, wasmLimitKb = MAX_LAZY_WASM_GZIPPED_SIZE_KB) {
  const limitBytes = limitKb * 1024;
  const wasmLimitBytes = wasmLimitKb * 1024;
  const files = getFiles(distDir);
  let totalGzipSize = 0;
  let totalRawSize = 0;
  let wasmGzipSize = 0;
  const reports = [];

  for (const file of files) {
    const relativePath = path.relative(distDir, file);
    const content = fs.readFileSync(file);
    const gzipped = zlib.gzipSync(content);
    reports.push({
      path: relativePath,
      rawSize: content.length,
      gzipSize: gzipped.length
    });
    if (isLazyWasm(relativePath.split(path.sep).join('/'))) {
      wasmGzipSize += gzipped.length;
      continue;
    }
    totalRawSize += content.length;
    totalGzipSize += gzipped.length;
  }

  return {
    totalRawSize,
    totalGzipSize,
    limitBytes,
    wasmGzipSize,
    wasmLimitBytes,
    reports,
    exceeds: totalGzipSize > limitBytes,
    wasmExceeds: wasmGzipSize > wasmLimitBytes
  };
}

export function runCheck() {
  try {
    const result = verifyBundleSize(DIST_DIR, MAX_GZIPPED_SIZE_KB);
    
    console.log('Calculating Gzipped sizes for client distribution files...\n');
    console.log(
      `${'File Path'.padEnd(65)} | ${'Raw Size'.padStart(10)} | ${'Gzip Size'.padStart(10)}`
    );
    console.log('-'.repeat(91));

    for (const report of result.reports) {
      console.log(
        `${report.path.padEnd(65)} | ${(report.rawSize / 1024).toFixed(2).padStart(7)} KB | ${(report.gzipSize / 1024).toFixed(2).padStart(7)} KB`
      );
    }

    console.log('-'.repeat(91));
    console.log(
      `Grand Total Raw Size:     ${(result.totalRawSize / 1024).toFixed(2)} KB`
    );
    console.log(
      `Grand Total Gzipped Size: ${(result.totalGzipSize / 1024).toFixed(2)} KB`
    );
    console.log(`Max Allowed Gzipped Size: ${MAX_GZIPPED_SIZE_KB}.00 KB`);

    if (result.exceeds) {
      console.error(
        `\n❌ ERROR: Total Gzipped net transfer size of client-side assets (${(result.totalGzipSize / 1024).toFixed(2)} KB) exceeds the limit of ${MAX_GZIPPED_SIZE_KB} KB!`
      );
      process.exit(1);
    }

    console.log(
      `Lazy WebAssembly Gzipped: ${(result.wasmGzipSize / 1024).toFixed(2)} KB (budget ${MAX_LAZY_WASM_GZIPPED_SIZE_KB}.00 KB, not in the total)`
    );
    if (result.wasmExceeds) {
      console.error(
        `\n❌ ERROR: The lazily loaded WebAssembly (${(result.wasmGzipSize / 1024).toFixed(2)} KB gzipped) exceeds its ${MAX_LAZY_WASM_GZIPPED_SIZE_KB} KB budget!`
      );
      process.exit(1);
    }

    console.log(`\n✅ Gzipped transfer size is well within the ${MAX_GZIPPED_SIZE_KB} KB budget!`);
    process.exit(0);
  } catch (err) {
    console.error('Error running bundle size check:', err);
    process.exit(1);
  }
}

const isDirectRun = process.argv[1] && (fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url));
if (isDirectRun) {
  runCheck();
}
