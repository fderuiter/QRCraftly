import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Normalizes path string by converting backslashes to forward slashes.
 *
 * @param {string} inputPath
 * @returns {string}
 */
export function normalizePath(inputPath) {
  if (!inputPath) return '';
  return inputPath.replace(/\\/g, '/');
}

/**
 * Determines whether the ES module referencing importMetaUrl was invoked directly via CLI.
 *
 * @param {string} importMetaUrl - import.meta.url of the caller module
 * @param {string} [argv1=process.argv[1]] - Main script path passed to process
 * @returns {boolean} True if module was executed directly
 */
export function isDirectExecution(importMetaUrl, argv1 = process.argv[1]) {
  if (!argv1 || !importMetaUrl) return false;
  try {
    const scriptPath = fs.realpathSync(fileURLToPath(importMetaUrl));
    const executedPath = fs.realpathSync(argv1);
    return scriptPath === executedPath;
  } catch (_e) {
    try {
      const scriptPath = normalizePath(fileURLToPath(importMetaUrl));
      const executedPath = normalizePath(path.resolve(argv1));
      if (scriptPath === executedPath) return true;

      const fileName = path.basename(scriptPath);
      return normalizePath(argv1).endsWith(fileName);
    } catch (_e2) {
      return false;
    }
  }
}

/**
 * Standardized command line argument parser.
 *
 * @param {string[]} [args=process.argv.slice(2)] - Arguments array (defaults to process.argv.slice(2))
 * @param {object} [options={}] - Options
 * @param {boolean} [options.splitLists=true] - Whether to split comma or whitespace separated lists in positional args
 * @returns {{ flags: Record<string, boolean|string>, positionals: string[], files: string[] }}
 */
export function parseCliArgs(args = process.argv.slice(2), options = {}) {
  const { splitLists = true } = options;
  const flags = {};
  const positionals = [];
  const files = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg) continue;

    if (arg.startsWith('--')) {
      const eqIdx = arg.indexOf('=');
      if (eqIdx !== -1) {
        const key = arg.slice(2, eqIdx);
        const val = arg.slice(eqIdx + 1);
        flags[key] = val;
      } else {
        const key = arg.slice(2);
        if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
          // Check if next arg is value
          flags[key] = args[i + 1];
          i++;
        } else {
          flags[key] = true;
        }
      }
    } else if (arg.startsWith('-') && arg.length > 1) {
      const eqIdx = arg.indexOf('=');
      if (eqIdx !== -1) {
        const key = arg.slice(1, eqIdx);
        const val = arg.slice(eqIdx + 1);
        flags[key] = val;
      } else {
        const key = arg.slice(1);
        if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
          flags[key] = args[i + 1];
          i++;
        } else {
          flags[key] = true;
        }
      }
    } else {
      positionals.push(arg);

      if (splitLists && /[\s,]/.test(arg)) {
        const parts = arg.split(/[\s,]+/);
        for (const part of parts) {
          const trimmed = part.trim();
          if (trimmed) {
            files.push(normalizePath(trimmed));
          }
        }
      } else {
        files.push(normalizePath(arg));
      }
    }
  }

  return { flags, positionals, files };
}

if (isDirectExecution(import.meta.url)) {
  const parsed = parseCliArgs(process.argv.slice(2));
  console.log('[cliHelper] Direct execution check passed.');
  console.log('[cliHelper] Parsed args:', JSON.stringify(parsed, null, 2));
}
