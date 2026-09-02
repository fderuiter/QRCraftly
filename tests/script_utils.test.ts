import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs';
import { isDirectExecution, parseCliArgs, normalizePath } from '../scripts/utils/cliHelper.js';
import { walkDir, findFiles } from '../scripts/utils/fileWalker.js';
import { parseSourceFile, evaluateExpression, walkAst, ts } from '../scripts/utils/astHelper.js';
import { decodeGitPath, parseGitStatus, parseGitDiff, getModifiedFiles } from '../scripts/utils/gitHelper.js';
import { execBinary, execShell, resolveBash, resolveCommand } from '../scripts/utils/execHelper.js';

describe('Centralized Script Utility Suite', () => {
  describe('cliHelper', () => {
    it('normalizes path strings with forward slashes', () => {
      expect(normalizePath('foo\\bar\\baz')).toBe('foo/bar/baz');
      expect(normalizePath('a/b/c')).toBe('a/b/c');
      expect(normalizePath('')).toBe('');
    });

    it('correctly detects direct execution vs import', () => {
      const currentFileUrl = import.meta.url;
      const currentFilePath = path.resolve(import.meta.url.replace('file://', ''));
      expect(isDirectExecution(currentFileUrl, currentFilePath)).toBe(true);
      expect(isDirectExecution(currentFileUrl, '/some/other/file.js')).toBe(false);
    });

    it('parses flags, key-value options, and positional path inputs', () => {
      const args = ['--verbose', '--target=dist', '-f', 'val', 'src/file1.ts,src/file2.ts', 'src/file3.ts'];
      const parsed = parseCliArgs(args);

      expect(parsed.flags['verbose']).toBe(true);
      expect(parsed.flags['target']).toBe('dist');
      expect(parsed.flags['f']).toBe('val');
      expect(parsed.positionals).toContain('src/file3.ts');
      expect(parsed.files).toContain('src/file1.ts');
      expect(parsed.files).toContain('src/file2.ts');
      expect(parsed.files).toContain('src/file3.ts');
    });
  });

  describe('fileWalker', () => {
    it('traverses directory tree recursively and respects extension filter', () => {
      const root = path.join(process.cwd(), 'scripts/utils');
      const files = walkDir(root, { extensions: ['.js'] });

      expect(files.length).toBeGreaterThan(0);
      expect(files.every(f => f.endsWith('.js'))).toBe(true);
      expect(files.every(f => !f.includes('\\'))).toBe(true);
    });

    it('supports relative paths and directory exclusions', () => {
      const files = walkDir(process.cwd(), {
        relative: true,
        extensions: ['.json'],
        excludeDirs: ['node_modules', '.git', 'src', 'docs', 'e2e', 'tests', 'functions', 'public', '.agents'],
      });

      expect(files).toContain('package.json');
      expect(files.every(f => !f.startsWith('node_modules'))).toBe(true);
    });

    it('findFiles is an alias for walkDir', () => {
      expect(findFiles).toBe(walkDir);
    });
  });

  describe('astHelper', () => {
    it('parses source code into TypeScript AST', () => {
      const sourceFile = parseSourceFile('test.ts', 'const a: number = 42;');
      expect(sourceFile).toBeDefined();
      expect(sourceFile.fileName).toBe('test.ts');
    });

    it('evaluates string literals, plus binary expressions, and template literals', () => {
      const code = `
        const a = "hello " + "world";
        const b = \`foo_\${"bar"}\`;
        const c = 123;
      `;
      const sourceFile = parseSourceFile('test.ts', code);
      const evaluated: string[] = [];

      walkAst(sourceFile, node => {
        if (ts.isVariableDeclaration(node) && node.initializer) {
          const val = evaluateExpression(node.initializer);
          if (val !== null) evaluated.push(val);
        }
      });

      expect(evaluated).toContain('hello world');
      expect(evaluated).toContain('foo_bar');
      expect(evaluated.length).toBe(2);
    });
  });

  describe('gitHelper', () => {
    it('decodes escaped octal and C-style escape Git path strings', () => {
      expect(decodeGitPath('"foo/bar.txt"')).toBe('foo/bar.txt');
      expect(decodeGitPath('"path\\\\with\\\\backslashes"')).toBe('path/with/backslashes');
      expect(decodeGitPath('\\303\\271')).toBe('ù');
      expect(decodeGitPath('\\303\\251')).toBe('é');
    });

    it('parses git status porcelain output line by line', () => {
      const statusOutput = `
 M src/index.ts
?? newfile.ts
R  old.ts -> new.ts
`;
      const set = parseGitStatus(statusOutput);
      expect(set.has('src/index.ts')).toBe(true);
      expect(set.has('newfile.ts')).toBe(true);
      expect(set.has('new.ts')).toBe(true);
    });

    it('parses git diff name-only output', () => {
      const diffOutput = 'src/components/Button.tsx\nsrc/utils/a11y.ts\n';
      const set = parseGitDiff(diffOutput);
      expect(set.has('src/components/Button.tsx')).toBe(true);
      expect(set.has('src/utils/a11y.ts')).toBe(true);
    });

    it('safely queries modified files using getModifiedFiles', () => {
      const modified = getModifiedFiles();
      expect(modified).toBeInstanceOf(Set);
    });
  });

  describe('execHelper', () => {
    it('resolves executables and normalizes output', () => {
      const resolved = resolveCommand('node');
      expect(resolved).toBeDefined();

      const output = execShell('node -v');
      expect(output).toMatch(/^v\d+/);
      expect(output).not.toContain('\r\n');

      const bash = resolveBash();
      expect(bash).toBeDefined();
    });
  });
});
