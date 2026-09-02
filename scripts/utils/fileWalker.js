import fs from 'fs';
import path from 'path';
import { isDirectExecution, normalizePath } from './cliHelper.js';

const DEFAULT_EXCLUDE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage']);

/**
 * Direct file tree traversal helper using native filesystem methods.
 * Recursively walks directory tree without external glob dependencies.
 *
 * @param {string} dirPath - Root directory path to walk
 * @param {object} [options={}] - Walk options
 * @param {string[]|Set<string>} [options.extensions] - File extensions to filter (e.g. ['.js', '.ts'])
 * @param {string[]|Set<string>} [options.excludeDirs] - Directory names to skip
 * @param {string[]|Set<string>} [options.excludeFiles] - Specific file paths/names to skip
 * @param {function(string, fs.Stats): boolean} [options.filter] - Custom filter predicate
 * @param {boolean} [options.relative=false] - Whether to return relative paths instead of absolute
 * @param {string} [options.baseDir] - Base directory for computing relative paths (defaults to dirPath)
 * @returns {string[]} Array of normalized file paths (POSIX slashes)
 */
export function walkDir(dirPath, options = {}) {
  const {
    extensions = null,
    excludeDirs = DEFAULT_EXCLUDE_DIRS,
    excludeFiles = null,
    filter = null,
    relative = false,
    baseDir = dirPath,
  } = options;

  const extSet = extensions
    ? new Set(Array.from(extensions).map(e => (e.startsWith('.') ? e.toLowerCase() : `.${e.toLowerCase()}`)))
    : null;

  const excludeDirSet = excludeDirs ? new Set(excludeDirs) : DEFAULT_EXCLUDE_DIRS;
  const excludeFileSet = excludeFiles ? new Set(Array.from(excludeFiles).map(f => normalizePath(f))) : null;

  let results = [];
  if (!fs.existsSync(dirPath)) return results;

  try {
    const list = fs.readdirSync(dirPath);
    for (const item of list) {
      if (excludeDirSet.has(item)) continue;

      const fullPath = path.join(dirPath, item);
      let stat;
      try {
        stat = fs.statSync(fullPath);
      } catch (_e) {
        continue;
      }

      if (stat.isDirectory()) {
        const subResults = walkDir(fullPath, {
          ...options,
          baseDir,
        });
        results = results.concat(subResults);
      } else if (stat.isFile()) {
        const normalizedFull = normalizePath(fullPath);
        const relPath = normalizePath(path.relative(baseDir, fullPath));

        if (excludeFileSet && (excludeFileSet.has(normalizedFull) || excludeFileSet.has(relPath) || excludeFileSet.has(item))) {
          continue;
        }

        if (extSet) {
          const ext = path.extname(item).toLowerCase();
          if (!extSet.has(ext)) continue;
        }

        if (filter && !filter(fullPath, stat)) {
          continue;
        }

        results.push(relative ? relPath : normalizedFull);
      }
    }
  } catch (_e) {
    // Return accumulated results if error occurs
  }

  return results;
}

/**
 * Alias helper for findFiles.
 */
export const findFiles = walkDir;

if (isDirectExecution(import.meta.url)) {
  const targetDir = process.argv[2] || process.cwd();
  console.log(`[fileWalker] Walking directory: ${targetDir}`);
  const files = walkDir(targetDir, { relative: true });
  console.log(`[fileWalker] Found ${files.length} file(s). Sample:`, files.slice(0, 10));
}
