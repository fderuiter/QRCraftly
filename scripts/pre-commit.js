import { spawnSync, execSync } from 'child_process';
import path from 'path';

try {
  // 1. Get staged files
  const stdout = execSync('git diff --cached --name-only --diff-filter=ACMR', { encoding: 'utf8' });
  const stagedFiles = stdout
    .split('\n')
    .map(file => file.trim())
    .filter(file => file.length > 0);

  // 2. Filter files for JS/TS files
  const lintableExtensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];
  const filesToLint = stagedFiles.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return lintableExtensions.includes(ext);
  });

  if (filesToLint.length === 0) {
    // No staged files need linting
    process.exit(0);
  }

  console.log(`\n🔍 Running local quality guardrails on ${filesToLint.length} staged file(s)...`);

  // 2.5 Run Tailwind class sorting/formatting first
  spawnSync('node', ['scripts/sort_tailwind_classes.js'], { stdio: 'inherit' });

  // 3. Run ESLint with --fix using spawnSync to handle space/special characters in filenames safely
  const eslintResult = spawnSync(
    'pnpm',
    ['exec', 'eslint', '--fix', '--no-warn-ignored', ...filesToLint],
    { stdio: 'inherit' }
  );

  // 4. Always re-stage any auto-fixes
  spawnSync('git', ['add', ...filesToLint]);
  
  // Also re-stage any modified files in the UI directory from the class sorting script
  spawnSync('git', ['add', 'src/components/ui']);

  if (eslintResult.status !== 0) {
    console.error('\n❌ Local quality guardrails failed. Please fix the linting/styling errors above before committing.');
    process.exit(1);
  }

  console.log('✅ Local quality guardrails passed!\n');
  process.exit(0);
} catch (err) {
  console.error('Error executing pre-commit hook:', err);
  process.exit(1);
}
