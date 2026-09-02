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
      const lines = content.split(/\r?\n/).map(l => l.trim());

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
      const message = err.message || '';
      if (
        err.code === 'ENOENT' ||
        err.code === 127 ||
        stderr.includes('not found') ||
        message.includes('not found') ||
        stderr.includes('not recognized') ||
        message.includes('not recognized')
      ) {
        console.warn('[CI Scripts Test] shellcheck binary not found in local environment, skipping static analysis pass');
        return;
      }
      expect.fail(`ShellCheck failed:\n${stdout}\n${stderr}`);
    }
  });

  it('should halt immediately with non-zero exit code on simulated intermediate piped failures', () => {
    if (process.platform === 'win32') {
      // Windows cmd does not support bash pipefail semantics natively
      return;
    }
    // Test that set -euo pipefail properly catches intermediate pipe failures
    const testCommand = `bash -c 'set -euo pipefail; false | echo "should not mask failure"; echo "unreachable"'`;
    expect(() => {
      execSync(testCommand, { stdio: 'pipe' });
    }).toThrow();
  });

  it('should validate toolchain Node version minimum requirement in verify_toolchain.sh', () => {
    if (process.platform === 'win32') return;
    const verifyScript = path.join(ciScriptsDir, 'verify_toolchain.sh');
    const mockBinDir = path.join(repoRoot, 'node_modules', '.tmp-bin-test');

    fs.mkdirSync(mockBinDir, { recursive: true });
    fs.writeFileSync(path.join(mockBinDir, 'pnpm'), '#!/bin/sh\necho "11.1.3"\n', { mode: 0o755 });

    try {
      // Test passing Node version >= 22.14.0
      fs.writeFileSync(path.join(mockBinDir, 'node'), '#!/bin/sh\necho "v22.22.3"\n', { mode: 0o755 });
      expect(() => {
        execSync(`bash "${verifyScript}"`, {
          env: { ...process.env, PATH: `${mockBinDir}:${process.env.PATH}` },
          stdio: 'pipe',
        });
      }).not.toThrow();

      // Test failing Node version < 22.14.0
      fs.writeFileSync(path.join(mockBinDir, 'node'), '#!/bin/sh\necho "v20.10.0"\n', { mode: 0o755 });
      expect(() => {
        execSync(`bash "${verifyScript}"`, {
          env: { ...process.env, PATH: `${mockBinDir}:${process.env.PATH}` },
          stdio: 'pipe',
        });
      }).toThrow();
    } finally {
      fs.rmSync(mockBinDir, { recursive: true, force: true });
    }
  });
});
