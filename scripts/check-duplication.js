import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

try {
  console.log('Running code duplication checks using locally installed jscpd...');
  execSync('pnpm jscpd src --config .jscpd.json', {
    cwd: repoRoot,
    stdio: 'inherit'
  });
  console.log('✅ Code duplication check passed successfully!');
} catch (error) {
  console.error('❌ Code duplication check failed or exceeded thresholds.');
  process.exit(1);
}
