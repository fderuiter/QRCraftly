import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.join(__dirname, '..');

export const MAPPING = {
  'src/utils/sharedContract.ts': 'docs/public/SCALING.md',
  'src/components/InputPanel.tsx': 'src/components/inputs/README.md'
};

/**
 * Checks for missing documentation updates given a set of modified files.
 * @param {Set<string>} modifiedFiles 
 * @returns {Array<{codeFile: string, docFile: string}>} Array of missing documentation updates
 */
export function checkLineage(modifiedFiles) {
  const missingUpdates = [];
  for (const [codeFile, docFile] of Object.entries(MAPPING)) {
    if (modifiedFiles.has(codeFile)) {
      if (!modifiedFiles.has(docFile)) {
        missingUpdates.push({ codeFile, docFile });
      }
    }
  }
  return missingUpdates;
}

export function parseGitStatus(stdout) {
  const modifiedFiles = new Set();
  const lines = stdout.split('\n');
  for (const line of lines) {
    if (line.length < 3) continue;
    const rawPath = line.substring(3).trim();
    let filePath = rawPath;

    if (filePath.startsWith('"') && filePath.endsWith('"')) {
      filePath = filePath.slice(1, -1);
    }

    if (filePath.includes(' -> ')) {
      filePath = filePath.split(' -> ')[1].trim();
    }

    const normalized = filePath.replace(/\\/g, '/');
    modifiedFiles.add(normalized);
  }
  return modifiedFiles;
}

function runAuditor() {
  try {
    if (!fs.existsSync(path.join(repoRoot, '.git'))) {
      console.log('[Lineage Auditor] Not a git repository or .git folder missing. Skipping check.');
      return;
    }

    let stdout;
    try {
      stdout = execSync('git status --porcelain', { encoding: 'utf8', cwd: repoRoot });
    } catch (err) {
      console.warn('[Lineage Auditor] Failed to query git status. Skipping check.', err.message);
      return;
    }

    const trimmed = stdout.trim();
    if (!trimmed) {
      return;
    }

    const modifiedFiles = parseGitStatus(stdout);
    const missing = checkLineage(modifiedFiles);

    if (missing.length > 0) {
      console.error(`\n❌ [Lineage Auditor] Missing Documentation Update!`);
      for (const { codeFile, docFile } of missing) {
        console.error(`The core contract file '${codeFile}' was modified, but its mapped documentation guide '${docFile}' was not.`);
        console.error(`To resolve this block, please update: ${docFile}`);
      }
      console.error('');
      process.exit(1);
    }
  } catch (error) {
    console.error('[Lineage Auditor] Unexpected error during lineage check:', error);
    process.exit(1);
  }
}

// Only run automatically if executed directly
if (process.argv[1] && (process.argv[1] === fileURLToPath(import.meta.url) || process.argv[1].endsWith('git_lineage_auditor.js'))) {
  runAuditor();
}
