import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.join(__dirname, '..');

export const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', 'coverage', '.gemini', '.claude', '.agents'];

export const ALLOWLISTED_PLATFORM_BRANCHING_FILES = new Set([
  'scripts/utils/execHelper.js',
  'tests/utils/execHelper.ts',
  'tests/ci_scripts.test.ts',
  'scripts/path_invariance_auditor.js',
  'tests/path_invariance_auditor.test.ts',
]);

// Browser HTML5 file input values standardly return "C:\fakepath\filename"
export const ALLOWLISTED_FAKEMOCK_PATHS = [
  'C:\\fakepath\\',
  'C:\\\\fakepath\\\\',
  'fakepath',
  'MATMSG:TO:',
  'C:\\\\path\\\\to\\\\file',
  'C:\\path\\to\\file',
];

// Regex for detecting hardcoded Windows drives (e.g. C:\Users, D:/Project, file:///C:/...), not protocols like https://
const WINDOWS_DRIVE_REGEX = /(?:^|[\s"'`(=,\[])(?:file:\/\/\/)?([a-zA-Z]:(?:\\+|\/+)[a-zA-Z0-9_.\-]+(?:(?:\\+|\/+)[a-zA-Z0-9_.\-]+)*)/;

// Regex for detecting hardcoded Unix/macOS user directories (e.g., /home/user, /Users/user)
const UNIX_USER_HOME_REGEX = /(?:^|[\s"'`(=,\[])(?:\/(?:Users|home)\/[a-zA-Z0-9_.\-]+(?:\/[a-zA-Z0-9_.\-]+)+)/;

// Regex for detecting raw split on \n without handling \r
const RAW_NEWLINE_SPLIT_REGEX = /\.split\(\s*['"]\\n['"]\s*\)/;

// Regex for detecting ad-hoc process.platform branching
const PLATFORM_CHECK_REGEX = /process\.platform\s*===?\s*['"][^'"]+['"]/;

/**
 * Scans string content of a file for path invariance issues.
 *
 * @param {string} content - Raw content of the file
 * @param {string} relativePath - POSIX relative path of the file
 * @returns {Array<{file: string, line: number, type: string, message: string}>}
 */
export function scanContentForPathInvariants(content, relativePath) {
  const normalizedPath = relativePath.replace(/\\/g, '/');
  const lines = content.split(/\r?\n/);
  const findings = [];

  const isPlatformBranchingAllowed = ALLOWLISTED_PLATFORM_BRANCHING_FILES.has(normalizedPath);
  const isAuditorSelfOrTest = normalizedPath === 'scripts/path_invariance_auditor.js' || normalizedPath === 'tests/path_invariance_auditor.test.ts';

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    // 1. Check for hardcoded host paths
    const isMockPath = ALLOWLISTED_FAKEMOCK_PATHS.some(mock => line.includes(mock));
    if (!isMockPath && !isAuditorSelfOrTest && !normalizedPath.endsWith('.md')) {
      // Ignore common protocol matches (e.g. https://, http://, mailto:, ws://, wss://, git+https://)
      const cleanLine = line.replace(/https?:\/\/[^\s"'`)]+/g, '').replace(/wss?:\/\/[^\s"'`)]+/g, '');
      const winMatch = cleanLine.match(WINDOWS_DRIVE_REGEX);
      if (winMatch && !winMatch[1].includes('fakepath')) {
        findings.push({
          file: normalizedPath,
          line: lineNumber,
          type: 'Hardcoded Absolute Host Path',
          message: `Detected hardcoded Windows drive path '${winMatch[1]}'. Use relative paths with path.join or import.meta.url.`,
        });
      }

      const unixMatch = line.match(UNIX_USER_HOME_REGEX);
      if (unixMatch) {
        findings.push({
          file: normalizedPath,
          line: lineNumber,
          type: 'Hardcoded Absolute Host Path',
          message: `Detected hardcoded user directory '${unixMatch[0].trim()}'. Use relative paths or dynamic environment configuration.`,
        });
      }
    }

    // 2. Check for fragile newline splitting in scripts or test files
    if (normalizedPath.startsWith('scripts/') || normalizedPath.startsWith('tests/') || normalizedPath.endsWith('.test.ts') || normalizedPath.endsWith('.test.tsx')) {
      if (!isAuditorSelfOrTest && RAW_NEWLINE_SPLIT_REGEX.test(line)) {
        findings.push({
          file: normalizedPath,
          line: lineNumber,
          type: 'Unhandled CRLF Line Splitting',
          message: `Detected fragile '.split(\\'\\\\n\\')'. Use '.split(/\\\\r?\\\\n/)' for cross-platform CRLF/LF resilience.`,
        });
      }
    }

    // 3. Check for ad-hoc platform checks
    if (!isPlatformBranchingAllowed && PLATFORM_CHECK_REGEX.test(line)) {
      findings.push({
        file: normalizedPath,
        line: lineNumber,
        type: 'Ad-Hoc Platform Branching',
        message: `Detected ad-hoc process.platform branching. Use centralized helpers in 'scripts/utils/execHelper.js' or 'tests/utils/execHelper.ts'.`,
      });
    }
  });

  return findings;
}

/**
 * Scans a single file on disk for path invariance violations.
 *
 * @param {string} filePath - Path to file
 * @returns {Array<object>}
 */
export function scanFileForPathInvariants(filePath) {
  const absolutePath = path.resolve(filePath);
  const relativePath = path.relative(repoRoot, absolutePath).replace(/\\/g, '/');

  if (EXCLUDE_DIRS.some(d => relativePath.split('/').includes(d))) {
    return [];
  }

  if (!fs.existsSync(absolutePath)) {
    return [];
  }

  try {
    const stats = fs.statSync(absolutePath);
    if (!stats.isFile()) return [];
  } catch (_e) {
    return [];
  }

  const content = fs.readFileSync(absolutePath, 'utf8');
  return scanContentForPathInvariants(content, relativePath);
}

/**
 * Walks directory recursively to collect candidate source files.
 */
function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const item of list) {
    if (EXCLUDE_DIRS.includes(item)) continue;
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else {
      const ext = path.extname(item).toLowerCase();
      if (['.js', '.ts', '.tsx', '.cjs', '.mjs', '.json', '.md'].includes(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

/**
 * Main path invariance audit runner.
 */
export function runPathInvarianceAudit() {
  console.log('\n=== [Path Invariance & Platform Agnosticism Audit] Scanning Repository ===');
  const startTime = Date.now();

  const candidateDirs = ['src', 'scripts', 'tests', 'functions'];
  let filesToScan = [];

  for (const d of candidateDirs) {
    const dirPath = path.join(repoRoot, d);
    filesToScan = filesToScan.concat(walk(dirPath));
  }

  // Root files
  const rootFiles = ['package.json', 'tsconfig.json', 'vite.config.ts', 'playwright.config.ts'];
  for (const f of rootFiles) {
    const full = path.join(repoRoot, f);
    if (fs.existsSync(full)) {
      filesToScan.push(full);
    }
  }

  let allFindings = [];
  for (const filePath of filesToScan) {
    try {
      const findings = scanFileForPathInvariants(filePath);
      allFindings = allFindings.concat(findings);
    } catch (_e) {
      // Ignore read errors
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  if (allFindings.length > 0) {
    console.error(`\n❌ [PATH INVARIANCE AUDIT FAILURE] Detected ${allFindings.length} platform invariance violation(s) in ${duration}s:\n`);

    allFindings.forEach(f => {
      console.error(`📍 Location: ${f.file}:${f.line}`);
      console.error(`🏷️  Type:     ${f.type}`);
      console.error(`💡 Message:  ${f.message}`);
      console.error('--------------------------------------------------\n');
    });

    console.error('💡 How to resolve:');
    console.error('   1. Avoid hardcoded OS drive letters or user home directories.');
    console.error('   2. Use .split(/\\r?\\n/) instead of .split(\'\\n\') in scripts and tests.');
    console.error('   3. Use execHelper utilities for cross-platform child process calls.\n');

    process.exit(1);
  }

  console.log(`✅ Path invariance & platform agnosticism audit passed successfully in ${duration}s. No violations found.\n`);
  process.exit(0);
}

if (process.argv[1]) {
  const realScriptPath = fs.realpathSync(fileURLToPath(import.meta.url));
  const realExecutedPath = fs.realpathSync(process.argv[1]);
  if (realScriptPath === realExecutedPath) {
    runPathInvarianceAudit();
  }
}
