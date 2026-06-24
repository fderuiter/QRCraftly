import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, "../dist/client");
const MAX_FILES = 20000;
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
// KV limit is also mentioned in the scenario: "KV store or asset limits"
// Cloudflare KV free tier limits: 100k reads/day, 1000 writes/day, 1GB total data.
// It's hard to track dynamic KV limits in a PR since they are runtime limits.
// The scenario specifically says "warning the developer if the change brings the project within 10% of a hard ceiling (e.g., Cloudflare Pages quotas)"

let fileCount = 0;
let maxFileSize = 0;
let maxFileName = "";
let totalSize = 0;

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else {
      fileCount++;
      totalSize += stat.size;
      if (stat.size > maxFileSize) {
        maxFileSize = stat.size;
        maxFileName = fullPath;
      }
    }
  }
}

walkDir(DIST_DIR);

const fileCountPct = (fileCount / MAX_FILES) * 100;
const maxFilePct = (maxFileSize / MAX_FILE_SIZE_BYTES) * 100;

console.log(`Resource Quota Report:`);
console.log(`Files: ${fileCount} / ${MAX_FILES} (${fileCountPct.toFixed(2)}%)`);
console.log(
  `Largest File: ${maxFileName} - ${(maxFileSize / 1024 / 1024).toFixed(2)}MB / 25MB (${maxFilePct.toFixed(2)}%)`,
);
console.log(`Total Size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);

const markdown = `## 📊 Resource Impact Report

| Resource | Current Usage | Hard Ceiling | % Used | Status |
|---|---|---|---|---|
| **File Count** | ${fileCount} | ${MAX_FILES} | ${fileCountPct.toFixed(2)}% | ${fileCountPct >= 90 ? "⚠️ WARNING" : "✅ OK"} |
| **Max File Size** | ${(maxFileSize / 1024 / 1024).toFixed(2)} MB | 25 MB | ${maxFilePct.toFixed(2)}% | ${maxFilePct >= 90 ? "⚠️ WARNING" : "✅ OK"} |
| **Total Size** | ${(totalSize / 1024 / 1024).toFixed(2)} MB | N/A | N/A | ℹ️ INFO |

*(Largest file: \`${maxFileName ? maxFileName.replace(path.join(__dirname, "../"), "") : "N/A"}\`)*

${fileCountPct >= 90 || maxFilePct >= 90 ? "> **⚠️ WARNING:** Your changes bring the project within 10% of a Cloudflare Pages hard ceiling." : "> ✅ Resource usage is well within limits."}
`;

fs.writeFileSync(path.join(__dirname, "../quota-report.md"), markdown);
