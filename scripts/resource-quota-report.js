import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { walkDir } from './utils/fileWalker.js';
import { isDirectExecution } from './utils/cliHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, '../dist/client');
const MAX_FILES = 20000;
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

export function generateReport() {
  let fileCount = 0;
  let maxFileSize = 0;
  let maxFileName = '';
  let totalSize = 0;

  const files = walkDir(DIST_DIR);
  for (const fullPath of files) {
    try {
      const stat = fs.statSync(fullPath);
      fileCount++;
      totalSize += stat.size;
      if (stat.size > maxFileSize) {
        maxFileSize = stat.size;
        maxFileName = fullPath;
      }
    } catch (_e) {}
  }

  const fileCountPct = (fileCount / MAX_FILES) * 100;
  const maxFilePct = (maxFileSize / MAX_FILE_SIZE_BYTES) * 100;

  console.log(`Resource Quota Report:`);
  console.log(`Files: ${fileCount} / ${MAX_FILES} (${fileCountPct.toFixed(2)}%)`);
  console.log(`Largest File: ${maxFileName} - ${(maxFileSize/1024/1024).toFixed(2)}MB / 25MB (${maxFilePct.toFixed(2)}%)`);
  console.log(`Total Size: ${(totalSize/1024/1024).toFixed(2)}MB`);

  const markdown = `## 📊 Resource Impact Report

| Resource | Current Usage | Hard Ceiling | % Used | Status |
|---|---|---|---|---|
| **File Count** | ${fileCount} | ${MAX_FILES} | ${fileCountPct.toFixed(2)}% | ${fileCountPct >= 90 ? '⚠️ WARNING' : '✅ OK'} |
| **Max File Size** | ${(maxFileSize/1024/1024).toFixed(2)} MB | 25 MB | ${maxFilePct.toFixed(2)}% | ${maxFilePct >= 90 ? '⚠️ WARNING' : '✅ OK'} |
| **Total Size** | ${(totalSize/1024/1024).toFixed(2)} MB | N/A | N/A | ℹ️ INFO |

*(Largest file: \`${maxFileName ? maxFileName.replace(path.join(__dirname, '../'), '') : 'N/A'}\`)*

${fileCountPct >= 90 || maxFilePct >= 90 ? '> **⚠️ WARNING:** Your changes bring the project within 10% of a Cloudflare Pages hard ceiling.' : '> ✅ Resource usage is well within limits.'}
`;

  fs.writeFileSync(path.join(__dirname, '../quota-report.md'), markdown);
}

if (isDirectExecution(import.meta.url)) {
  generateReport();
}
