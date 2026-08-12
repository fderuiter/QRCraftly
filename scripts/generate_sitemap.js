// This is a wrapper to execute scripts/generate_sitemap.ts using tsx.
// The TypeScript script is the true sitemap generator, which ignores routes with:
// 'dev-sandbox', 'draft', 'test'
import { execFileSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  execFileSync('npx', ['tsx', path.join(__dirname, 'generate_sitemap.ts')], {
    stdio: 'inherit',
    env: process.env
  });
} catch (error) {
  console.error('[Sitemap wrapper] Execution failed:', error);
  process.exit(1);
}
