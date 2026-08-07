import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const wranglerBinDir = path.resolve(__dirname, '../node_modules/wrangler/bin');
const wranglerJs = path.join(wranglerBinDir, 'wrangler.js');
const wranglerRealJs = path.join(wranglerBinDir, 'wrangler-real.js');

try {
  if (!fs.existsSync(wranglerJs)) {
    console.error(`[Patch Wrangler] wrangler.js not found at ${wranglerJs}`);
    process.exit(1);
  }

  if (fs.existsSync(wranglerRealJs)) {
    console.log('[Patch Wrangler] wrangler.js is already patched.');
    process.exit(0);
  }

  // Rename original wrangler.js to wrangler-real.js
  fs.renameSync(wranglerJs, wranglerRealJs);

  const wrapperContent = `#!/usr/bin/env node
const cp = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=== [Wrangler Wrapper] Intercepted Wrangler! ===');
console.log('Arguments:', process.argv);

console.log('=== [Wrangler Wrapper] Git status BEFORE wrangler runs ===');
try {
  console.log(cp.execSync('git status --porcelain --ignored', { encoding: 'utf8' }));
} catch (err) {
  console.error('Failed to run git status:', err);
}

const realWranglerPath = path.join(__dirname, 'wrangler-real.js');

try {
  const result = cp.spawnSync(process.execPath, [realWranglerPath, ...process.argv.slice(2)], {
    stdio: 'inherit'
  });
  
  console.log(\`=== [Wrangler Wrapper] Wrangler finished with exit code \${result.status} ===\`);
  
  if (result.status !== 0) {
    console.log('=== [Wrangler Wrapper] Wrangler failed! Running diagnostics... ===');
    console.log('=== [Wrangler Wrapper] Git status AFTER wrangler failed ===');
    try {
      console.log(cp.execSync('git status --porcelain --ignored', { encoding: 'utf8' }));
    } catch (err) {
      console.error('Failed to run git status:', err);
    }
  }
  
  process.exit(result.status ?? 1);
} catch (err) {
  console.error('=== [Wrangler Wrapper] Failed to execute real wrangler:', err);
  process.exit(1);
}
`;

  fs.writeFileSync(wranglerJs, wrapperContent, 'utf8');
  fs.chmodSync(wranglerJs, 0o755);
  console.log('✅ [Patch Wrangler] Successfully patched wrangler.js with diagnostics wrapper!');
} catch (err) {
  console.error('[Patch Wrangler] Failed to patch wrangler:', err);
  process.exit(1);
}
