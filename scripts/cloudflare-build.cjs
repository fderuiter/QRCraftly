const { execSync } = require('child_process');

console.log('[Cloudflare Builder] Starting custom Workers Build...');
console.log('[Cloudflare Builder] Host Node.js version:', process.version);

try {
  console.log('[Cloudflare Builder] Step 1: Installing dependencies using Node 22 & PNPM 11...');
  execSync('npx -y -p node@22 -p pnpm@11 pnpm install', { stdio: 'inherit' });

  console.log('[Cloudflare Builder] Step 2: Building application using Node 22 & PNPM 11...');
  execSync('npx -y -p node@22 -p pnpm@11 pnpm run build', { stdio: 'inherit' });

  console.log('[Cloudflare Builder] Custom Workers Build completed successfully!');
} catch (error) {
  console.error('[Cloudflare Builder] Custom Workers Build failed:', error);
  process.exit(1);
}
