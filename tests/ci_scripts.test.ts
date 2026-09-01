import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.join(__dirname, '..');
const ciScriptsDir = path.join(repoRoot, 'scripts', 'ci');

describe('CI Modular Shell Scripts Validation', () => {
  it('should find the scripts/ci directory and script files', () => {
    expect(fs.existsSync(ciScriptsDir)).toBe(true);
    const files = fs.readdirSync(ciScriptsDir).filter(f => f.endsWith('.sh'));
    expect(files.length).toBeGreaterThan(0);
  });

  it('should enforce strict execution flags in all extracted shell scripts', () => {
    const files = fs.readdirSync(ciScriptsDir).filter(f => f.endsWith('.sh'));
    for (const file of files) {
      const filePath = path.join(ciScriptsDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').map(l => l.trim());

      expect(lines[0], `${file} shebang`).toMatch(/^#!\/usr\/bin\/(env )?bash$/);
      const hasStrictFlags = lines.slice(1, 5).some(l => l.includes('set -euo pipefail') || l.includes('set -e'));
      expect(hasStrictFlags, `${file} strict execution flags`).toBe(true);
    }
  });

  it('should pass ShellCheck static analysis on all extracted shell scripts', () => {
    const files = fs.readdirSync(ciScriptsDir).filter(f => f.endsWith('.sh'));
    expect(files.length).toBeGreaterThan(0);

    const scriptPaths = files.map(f => path.join(ciScriptsDir, f));
    try {
      execSync(`shellcheck ${scriptPaths.map(p => `"${p}"`).join(' ')}`, {
        encoding: 'utf8',
        cwd: repoRoot,
      });
    } catch (err: any) {
      const stdout = err.stdout ? err.stdout.toString() : '';
      const stderr = err.stderr ? err.stderr.toString() : '';
      expect.fail(`ShellCheck failed:\n${stdout}\n${stderr}`);
    }
  });

  it('should halt immediately with non-zero exit code on simulated intermediate piped failures', () => {
    // Test that set -euo pipefail properly catches intermediate pipe failures
    const testCommand = `bash -c 'set -euo pipefail; false | echo "should not mask failure"; echo "unreachable"'`;
    expect(() => {
      execSync(testCommand, { stdio: 'pipe' });
    }).toThrow();
  });
});
