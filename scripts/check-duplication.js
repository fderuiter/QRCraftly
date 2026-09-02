import path from 'path';
import { fileURLToPath } from 'url';
import { execShell } from './utils/execHelper.js';
import { isDirectExecution } from './utils/cliHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

export function checkDuplication() {
  try {
    console.log('Running code duplication checks using locally installed jscpd...');
    execShell('pnpm jscpd src --config .jscpd.json', {
      cwd: repoRoot,
      stdio: 'inherit'
    });
    console.log('✅ Code duplication check passed successfully!');
  } catch (_error) {
    console.error('❌ Code duplication check failed or exceeded thresholds.');
    process.exit(1);
  }
}

if (isDirectExecution(import.meta.url)) {
  checkDuplication();
}
