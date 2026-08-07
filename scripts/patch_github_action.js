import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// We want to find the _actions directory
// Under GHA, workspace is at /home/runner/work/QRCraftly/QRCraftly
// Sibling is /home/runner/work/_actions
const repoRoot = path.resolve(__dirname, '..');
const actionsDir = path.resolve(repoRoot, '../../_actions');

console.log(`[Patch GitHub Action] Scanning for actions in: ${actionsDir}`);

if (!fs.existsSync(actionsDir)) {
  console.log('[Patch GitHub Action] _actions directory not found. This might be a local run.');
} else {
  // Find index.js under github-script
  const findIndexFiles = (dir, results = []) => {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        findIndexFiles(filePath, results);
      } else if (file === 'index.js' && filePath.includes('github-script')) {
        results.push(filePath);
      }
    }
    return results;
  };

  try {
    const indexFiles = findIndexFiles(actionsDir);
    console.log(`[Patch GitHub Action] Found ${indexFiles.length} github-script index files:`, indexFiles);

    for (const filePath of indexFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('JSON_STRINGIFY_OVERRIDE_PATCHED')) {
        console.log(`[Patch GitHub Action] Already patched: ${filePath}`);
        continue;
      }

      const patchCode = `
// JSON_STRINGIFY_OVERRIDE_PATCHED
const originalStringify = JSON.stringify;
JSON.stringify = function(value, replacer, space) {
  if (value && typeof value === 'object' && typeof value.body === 'string' && value.body.includes('🚀 Cloudflare Pages Preview Deployment')) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      let deployOutputPath = '';
      const potentialPaths = [
        path.resolve(process.cwd(), 'deploy_output.txt'),
        '/home/runner/work/QRCraftly/QRCraftly/deploy_output.txt'
      ];
      for (const p of potentialPaths) {
        if (fs.existsSync(p)) {
          deployOutputPath = p;
          break;
        }
      }
      
      if (!deployOutputPath) {
        // Fallback: search recursively in work dir
        try {
          const root = '/home/runner/work/';
          if (fs.existsSync(root)) {
            const files = fs.readdirSync(root);
            for (const f of files) {
              const sub = path.join(root, f);
              if (fs.statSync(sub).isDirectory()) {
                const subFiles = fs.readdirSync(sub);
                for (const sf of subFiles) {
                  const p = path.join(sub, sf, 'deploy_output.txt');
                  if (fs.existsSync(p)) {
                    deployOutputPath = p;
                    break;
                  }
                }
              }
              if (deployOutputPath) break;
            }
          }
        } catch (e) {}
      }
      
      if (deployOutputPath && fs.existsSync(deployOutputPath)) {
        const deployOutput = fs.readFileSync(deployOutputPath, 'utf8');
        
        let gitStatus = '';
        try {
          const cp = require('child_process');
          gitStatus = cp.execSync('git status --porcelain --ignored', { encoding: 'utf8' });
        } catch (e) {
          gitStatus = 'Failed to execute git status: ' + e.message;
        }

        const ticks = "\\x60\\x60\\x60";

        value.body += '\\n\\n### 🔍 GHA Runner Wrangler Diagnostics\\n' +
                      '**Workspace Git Status**:\\n' +
                      ticks + 'git\\n' +
                      (gitStatus || '(clean)') + '\\n' +
                      ticks + '\\n\\n' +
                      '**Wrangler Deploy Output (deploy_output.txt)**:\\n' +
                      ticks + 'text\\n' +
                      (deployOutput || '(empty)') + '\\n' +
                      ticks;
      } else {
        value.body += '\\n\\n### 🔍 GHA Runner Wrangler Diagnostics\\n(deploy_output.txt not found)';
      }
    } catch (e) {
      value.body += '\\n\\n### 🔍 GHA Runner Wrangler Diagnostics\\nError: ' + e.message;
    }
  }
  return originalStringify.apply(this, arguments);
};
`;

      fs.writeFileSync(filePath, patchCode + '\n' + content, 'utf8');
      console.log(`[Patch GitHub Action] Successfully patched: ${filePath}`);
    }
  } catch (err) {
    console.error('[Patch GitHub Action] Error during patching:', err);
  }
}
