import fs from 'fs';
import path from 'path';

const gitDir = path.resolve('.git');
const hookDir = path.resolve(gitDir, 'hooks');
const preCommitHookPath = path.resolve(hookDir, 'pre-commit');

if (!fs.existsSync(gitDir)) {
  console.log('Not a git repository, skipping git hook installation.');
  process.exit(0);
}

const hookContent = `#!/bin/sh
# Lightweight Local Quality Guardrails
pnpm run pre-commit
`;

try {
  if (!fs.existsSync(hookDir)) {
    fs.mkdirSync(hookDir, { recursive: true });
  }

  fs.writeFileSync(preCommitHookPath, hookContent, { encoding: 'utf8', mode: 0o755 });
  
  // Also try explicit chmod if on Unix
  try {
    fs.chmodSync(preCommitHookPath, 0o755);
  } catch (chmodErr) {
    // Ignore error if chmod is not supported/fails on this platform
  }

  console.log('✅ Pre-commit hook successfully installed!');
} catch (err) {
  console.error('Failed to install pre-commit hook:', err);
}
