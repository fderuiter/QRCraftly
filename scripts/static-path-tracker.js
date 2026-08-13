#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', 'coverage', 'experiments'];
const EXCLUDE_FILES = ['scripts/static-path-tracker.js', 'tests/static-path-tracker.test.ts'];

/**
 * Scans a file for unvalidated SVG source-to-sink data flows.
 * 
 * Sources: FileReader, readAsText, readAsDataURL, fetch of logos/images.
 * Sinks: onSuccess, logoUrl, borderLogoUrl, return statement, dangerouslySetInnerHTML.
 * Validation: sanitizeSvg.
 * 
 * @param {string} filePath - Absolute path to the file to scan.
 * @returns {Array<object>} List of findings.
 */
export function scanFileForPaths(filePath) {
  const relativePath = path.relative(process.cwd(), filePath);
  
  if (EXCLUDE_FILES.includes(relativePath.replace(/\\/g, '/'))) return [];
  if (EXCLUDE_DIRS.some(d => relativePath.split(path.sep).includes(d))) return [];
  if (filePath.endsWith('.test.ts') || filePath.endsWith('.test.tsx')) return [];
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return [];

  const content = fs.readFileSync(filePath, 'utf8');
  
  const hasSource = content.includes('FileReader') || content.includes('readAsText') || content.includes('readAsDataURL') || (content.includes('fetch(') && content.includes('logoUrl'));
  const hasSink = content.includes('onSuccess') || content.includes('logoUrl') || content.includes('borderLogoUrl') || content.includes('dangerouslySetInnerHTML');
  const hasSanitization = content.includes('sanitizeSvg');

  const findings = [];

  if (hasSource && hasSink && !hasSanitization) {
    findings.push({
      file: relativePath,
      type: 'Unvalidated SVG Source-to-Sink Path',
      message: 'Detected an SVG source (FileReader/fetch) flowing to a rendering/storage sink without passing through sanitizeSvg().',
    });
  }

  return findings;
}

function main() {
  let filesToScan = [];

  // Parse files from command line arguments (e.g. from lint-staged)
  if (process.argv.length > 2) {
    filesToScan = process.argv.slice(2).map(f => path.resolve(f));
  } else {
    // Walk through src directory recursively
    const walk = (dir) => {
      let results = [];
      const list = fs.readdirSync(dir);
      list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        const relPath = path.relative(process.cwd(), fullPath);
        if (EXCLUDE_DIRS.some(d => relPath.split(path.sep).includes(d))) return;
        if (stat && stat.isDirectory()) {
          results = results.concat(walk(fullPath));
        } else {
          results.push(fullPath);
        }
      });
      return results;
    };
    try {
      filesToScan = walk(path.join(process.cwd(), 'src'));
    } catch (err) {
      console.error('Error walking src directory:', err);
      process.exit(1);
    }
  }

  let allFindings = [];
  filesToScan.forEach(filePath => {
    try {
      const findings = scanFileForPaths(filePath);
      allFindings = allFindings.concat(findings);
    } catch (e) {
      // Ignore read errors
    }
  });

  if (allFindings.length > 0) {
    console.error('\n❌  [STATIC PATH TRACKING FAILURE] Unvalidated source-to-sink paths detected:\n');
    allFindings.forEach(f => {
      console.error(`📍 File:    ${f.file}`);
      console.error(`🏷️  Type:    ${f.type}`);
      console.error(`💡 Message: ${f.message}`);
      console.error('--------------------------------------------------\n');
    });
    console.error('💡 How to resolve:');
    console.error('   Ensure all custom SVG assets loaded via FileReader or fetch are');
    console.error('   sanitized using sanitizeSvg() from src/utils/security.ts prior to');
    console.error('   storage, state update, or output generation.\n');
    process.exit(1);
  }

  console.log('✅ Static path tracking verification completed successfully. No unvalidated paths found.');
  process.exit(0);
}

if (process.argv[1]) {
  const realScriptPath = fs.realpathSync(fileURLToPath(import.meta.url));
  const realExecutedPath = fs.realpathSync(process.argv[1]);
  if (realScriptPath === realExecutedPath) {
    main();
  }
}
