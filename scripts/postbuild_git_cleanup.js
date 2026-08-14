import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.join(__dirname, '..');

function getGitStatus() {
  try {
    return execSync('git status --porcelain --ignored', { encoding: 'utf8', cwd: repoRoot });
  } catch (err) {
    return 'No git status';
  }
}

console.log('=== Git Status Before Reset ===');
console.log(getGitStatus());

if (process.env.GITHUB_ACTIONS) {
  const lhciPath = path.join(repoRoot, 'lighthouserc.json');
  const lhciBakPath = path.join(repoRoot, 'lighthouserc.json.bak');
  let hasLhci = fs.existsSync(lhciPath);

  if (hasLhci) {
    try {
      fs.copyFileSync(lhciPath, lhciBakPath);
    } catch (e) {
      console.error('Failed to backup lighthouserc.json:', e.message);
    }
  }

  try {
    execSync('git reset --hard HEAD', { stdio: 'inherit', cwd: repoRoot });
  } catch (err) {
    console.error('git reset failed:', err.message);
  }

  if (hasLhci && fs.existsSync(lhciBakPath)) {
    try {
      fs.copyFileSync(lhciBakPath, lhciPath);
      fs.unlinkSync(lhciBakPath);
    } catch (e) {
      console.error('Failed to restore lighthouserc.json:', e.message);
    }
  }
}

console.log('=== Git Status After Reset ===');
console.log(getGitStatus());
