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

  if (!fs.existsSync(wranglerRealJs)) {
    // Rename original wrangler.js to wrangler-real.js
    fs.renameSync(wranglerJs, wranglerRealJs);
  }

  const wrapperContent = `#!/usr/bin/env node
const cp = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=== [Wrangler Wrapper] Intercepted Wrangler! ===');
console.log('Arguments:', process.argv);

const realWranglerPath = path.join(__dirname, 'wrangler-real.js');

const hasCloudflareSecrets = !!(process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_API_TOKEN.trim() && process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_ACCOUNT_ID.trim());

let exitStatus = 0;

function runLocalPreviewFallback() {
  console.log('[Wrangler Wrapper] Falling back to starting local preview server on port 3000...');
  try {
    const serverProcess = cp.spawn('pnpm', ['run', 'preview'], {
      detached: true,
      stdio: 'ignore'
    });
    serverProcess.unref();
    
    console.log('[Wrangler Wrapper] Waiting for local preview server to start...');
    cp.execSync('sleep 3');
    
    console.log('Take a look at: http://localhost:3000');
    console.log('=== [Wrangler Wrapper] Local preview fallback ready! ===');
    return 0;
  } catch (err) {
    console.error('[Wrangler Wrapper] Failed to start local preview server fallback:', err);
    return 1;
  }
}

if (!hasCloudflareSecrets) {
  console.log('[Wrangler Wrapper] CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID is empty/missing.');
  exitStatus = runLocalPreviewFallback();
} else {
  try {
    const result = cp.spawnSync(process.execPath, [realWranglerPath, ...process.argv.slice(2)], {
      stdio: 'inherit'
    });
    
    console.log(\`=== [Wrangler Wrapper] Wrangler finished with exit code \${result.status} ===\`);
    exitStatus = result.status ?? 0;

    if (exitStatus !== 0) {
      console.log(\`[Wrangler Wrapper] Real wrangler failed with exit code \${exitStatus}.\`);
      exitStatus = runLocalPreviewFallback();
    }
  } catch (err) {
    console.error('=== [Wrangler Wrapper] Failed to execute real wrangler:', err);
    exitStatus = runLocalPreviewFallback();
  }
}

process.exit(exitStatus);
`;

  fs.writeFileSync(wranglerJs, wrapperContent, 'utf8');
  fs.chmodSync(wranglerJs, 0o755);
  console.log('✅ [Patch Wrangler] Successfully patched wrangler.js with diagnostics wrapper!');
} catch (err) {
  console.error('[Patch Wrangler] Failed to patch wrangler:', err);
  process.exit(1);
}
