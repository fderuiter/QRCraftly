import { isDirectExecution, normalizePath } from './cliHelper.js';
import { execBinary } from './execHelper.js';

/**
 * Decodes Git porcelain escaped path string (handles octal byte sequences, C-style escapes, quotes).
 *
 * @param {string} filePath - Raw path from Git status or diff output
 * @returns {string} Decoded, normalized file path with POSIX slashes
 */
export function decodeGitPath(filePath) {
  if (!filePath) return '';
  let str = filePath.trim();
  if (str.startsWith('"') && str.endsWith('"')) {
    str = str.substring(1, str.length - 1);
  }

  const bytes = [];
  let i = 0;
  while (i < str.length) {
    if (str[i] === '\\' && i + 1 < str.length) {
      const nextChar = str[i + 1];
      if (nextChar >= '0' && nextChar <= '7') {
        let octalStr = '';
        for (let j = 0; j < 3 && i + 1 + j < str.length; j++) {
          const c = str[i + 1 + j];
          if (c >= '0' && c <= '7') {
            octalStr += c;
          } else {
            break;
          }
        }
        const byteVal = parseInt(octalStr, 8);
        if (byteVal > 255) {
          bytes.push('\\'.charCodeAt(0));
          for (let c = 0; c < octalStr.length; c++) {
            bytes.push(octalStr.charCodeAt(c));
          }
        } else {
          bytes.push(byteVal);
        }
        i += 1 + octalStr.length;
      } else {
        if (nextChar === 'n') bytes.push(10);
        else if (nextChar === 't') bytes.push(9);
        else if (nextChar === 'r') bytes.push(13);
        else if (nextChar === 'b') bytes.push(8);
        else if (nextChar === 'f') bytes.push(12);
        else if (nextChar === 'v') bytes.push(11);
        else if (nextChar === 'a') bytes.push(7);
        else if (nextChar === '"' || nextChar === '\\' || nextChar === ' ' || nextChar === '/' || nextChar === '\'') {
          bytes.push(nextChar.charCodeAt(0));
        } else {
          bytes.push('\\'.charCodeAt(0));
          bytes.push(nextChar.charCodeAt(0));
        }
        i += 2;
      }
    } else {
      bytes.push(str.charCodeAt(i));
      i += 1;
    }
  }

  let decoded;
  try {
    const uint8Array = new Uint8Array(bytes);
    decoded = new TextDecoder('utf-8', { fatal: true }).decode(uint8Array);
  } catch (_err) {
    try {
      const uint8Array = new Uint8Array(bytes);
      decoded = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array);
    } catch (_) {
      decoded = str;
    }
  }

  return normalizePath(decoded);
}

/**
 * Parses Git status porcelain output line by line.
 *
 * @param {string} stdout - Output from `git status --porcelain`
 * @returns {Set<string>} Set of normalized modified file paths
 */
export function parseGitStatus(stdout) {
  const modifiedFiles = new Set();
  if (!stdout) return modifiedFiles;

  const lines = stdout.split(/\r?\n/);
  for (const line of lines) {
    if (line.length < 3) continue;
    let rawPath = line.substring(3).trim();

    if (rawPath.includes(' -> ')) {
      rawPath = rawPath.split(' -> ')[1].trim();
    }

    const decoded = decodeGitPath(rawPath);
    if (decoded) {
      modifiedFiles.add(decoded);
    }
  }
  return modifiedFiles;
}

/**
 * Parses Git diff file list output line by line.
 *
 * @param {string} stdout - Output from `git diff --name-only`
 * @returns {Set<string>} Set of normalized modified file paths
 */
export function parseGitDiff(stdout) {
  const modifiedFiles = new Set();
  if (!stdout) return modifiedFiles;

  const lines = stdout.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const decoded = decodeGitPath(trimmed);
    if (decoded) {
      modifiedFiles.add(decoded);
    }
  }
  return modifiedFiles;
}

/**
 * Resolves modified files from Git environment or local repo state.
 *
 * @param {object} [options={}]
 * @param {string} [options.cwd=process.cwd()]
 * @param {function} [options.execFunc] - Custom process runner
 * @returns {Set<string>}
 */
export function getModifiedFiles(options = {}) {
  const { cwd = process.cwd(), execFunc = execBinary } = options;
  try {
    const stdout = execFunc('git', ['status', '--porcelain'], { cwd });
    return parseGitStatus(stdout);
  } catch (_e) {
    return new Set();
  }
}

if (isDirectExecution(import.meta.url)) {
  console.log('[gitHelper] Querying git status porcelain...');
  const files = getModifiedFiles();
  console.log(`[gitHelper] Detected ${files.size} modified file(s):`, Array.from(files));
}
