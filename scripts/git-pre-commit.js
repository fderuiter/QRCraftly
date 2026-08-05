import { spawn } from 'child_process';

function runCommand(command, args) {
  return new Promise((resolve) => {
    // Inherit stdio for interactive formatting, colorized output and clean progress indicators
    const child = spawn(command, args, { stdio: 'inherit', shell: true });
    child.on('close', (code) => {
      resolve(code === 0);
    });
  });
}

async function main() {
  const startTime = Date.now();
  console.log('🚀 Running pre-commit quality audits...');

  // Run lint-staged, jscpd, and knip in parallel
  const [lintOk, dupOk, knipOk] = await Promise.all([
    runCommand('pnpm', ['exec', 'lint-staged']),
    runCommand('pnpm', ['run', 'duplicate-check']),
    runCommand('pnpm', ['exec', 'knip'])
  ]);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`⏱️ Pre-commit audits completed in ${duration}s`);

  if (!lintOk || !dupOk || !knipOk) {
    console.error('❌ Pre-commit verification failed! Please fix the errors above.');
    process.exit(1);
  }

  console.log('✅ All pre-commit checks passed!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal pre-commit error:', err);
  process.exit(1);
});
