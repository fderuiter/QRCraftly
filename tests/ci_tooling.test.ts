import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import lintStagedConfig from '../lint-staged.config.js';

const root = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');

/** Minimal GitHub Actions `paths` glob matcher: `**` crosses folders, `*` does not. */
function matchesGlob(file: string, glob: string): boolean {
  const pattern = glob
    .split('**')
    .map(part => part.split('*').map(chunk => chunk.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*'))
    .join('.*');
  return new RegExp(`^${pattern}$`).test(file);
}

function workflowPushPaths(): string[] {
  const lines = read('.github/workflows/main.yml').split(/\r?\n/);
  const start = lines.findIndex(line => /^\s+paths:/.test(line));
  const paths: string[] = [];
  for (const line of lines.slice(start + 1)) {
    const match = /^\s+- '([^']+)'\s*$/.exec(line);
    if (!match) break;
    paths.push(match[1]);
  }
  return paths;
}

type PackageJson = {
  scripts: Record<string, string>;
  engines?: Record<string, string>;
  overrides?: unknown;
  devDependencies: Record<string, string>;
};

const pkg: PackageJson = JSON.parse(read('package.json'));

describe('CI trigger paths (main.yml)', () => {
  const paths = workflowPushPaths();

  it.each([
    'docs/adr/0001-client-side-storage-allowlist.md',
    'docs/agents/domain.md',
    'CONTEXT.md',
    'AGENTS.md',
    'README.md',
    'functions/api/redirect/register.ts',
    'tests/ci_tooling.test.ts',
    'eslint.config.js',
    'knip.json',
    'semgrep.yml',
    'pnpm-workspace.yaml',
    '.github/actions/setup/action.yml',
    'lint-staged.config.js',
    '.husky/pre-commit',
    '.nvmrc',
    '.github/rulesets/README.md'
  ])('runs CI when only %s changes', file => {
    expect(paths.some(glob => matchesGlob(file, glob))).toBe(true);
  });
});

describe('documentation checks wiring', () => {
  it('defines docs:lint with every doc audit', () => {
    const docsLint = pkg.scripts['docs:lint'];
    for (const step of ['audit_markdown.js', 'validate_adrs.js', 'validate_ui_catalog.js', 'compile_docs_manifest.js --check']) {
      expect(docsLint).toContain(step);
    }
  });

  it('runs docs:lint from lint, and never rewrites the docs manifest from lint or build', () => {
    expect(pkg.scripts.lint).toContain('pnpm run docs:lint');
    expect(pkg.scripts.lint).not.toMatch(/compile_docs_manifest\.js(?! --check)/);
    expect(pkg.scripts.build).toContain('compile_docs_manifest.js --check');
  });

  it('runs the doc checks from lint-staged for staged Markdown files', () => {
    const mdTask = lintStagedConfig['**/*.md'];
    expect(typeof mdTask).toBe('function');
    const commands = [mdTask(['docs/adr/0001-client-side-storage-allowlist.md'])].flat().join('\n');
    expect(commands).toContain('prettier --write');
    expect(commands).toContain('node scripts/audit_markdown.js');
    expect(commands).toContain('node scripts/validate_adrs.js');
    expect(commands).toContain('node scripts/compile_docs_manifest.js --check');
  });
});

describe('package.json hygiene', () => {
  it('declares engines matching the lockfile Node requirement', () => {
    expect(pkg.engines?.node).toBe('^22.22.2 || >=24.15.0');
    expect(read('.nvmrc').trim()).toBe('22.22.2');
    expect(read('.node-version').trim()).toBe('22.22.2');
  });

  it('keeps @types/node on the Node 22 line', () => {
    expect(pkg.devDependencies['@types/node']).toMatch(/^\^22\./);
  });

  it('has no npx calls, ignored overrides, unused deps or duplicate aliases', () => {
    for (const command of Object.values(pkg.scripts)) {
      expect(command).not.toMatch(/\bnpx\b/);
    }
    expect(pkg.overrides).toBeUndefined();
    expect(pkg.devDependencies['bidi-js']).toBeUndefined();
    const commands = Object.values(pkg.scripts);
    expect(new Set(commands).size).toBe(commands.length);
  });

  it('keeps pnpm overrides in pnpm-workspace.yaml', () => {
    const workspace = read('pnpm-workspace.yaml');
    expect(workspace).toMatch(/^overrides:/m);
    expect(workspace).toContain('browserslist:');
  });
});

describe('setup composite action', () => {
  const action = read('.github/actions/setup/action.yml');

  it('installs pnpm with pnpm/action-setup and Node from .nvmrc, not npm install -g', () => {
    expect(action).toMatch(/uses: pnpm\/action-setup@[0-9a-f]{40}/);
    expect(action).toContain('node-version-file: .nvmrc');
    expect(action).not.toMatch(/npm install -g/);
  });

  it('reports the real cache result instead of a hard-coded value', () => {
    expect(action).toContain('value: ${{ steps.setup-node.outputs.cache-hit }}');
    expect(action).not.toMatch(/cache-hit[^\n]*"true"/);
  });

  it('keeps ${{ }} expressions out of run: blocks', () => {
    const runLines = action.split(/\r?\n/).filter(line => /^\s*run:/.test(line));
    for (const line of runLines) {
      expect(line).not.toContain('${{');
    }
  });
});

describe('scheduled dependency audit email', () => {
  const workflow = read('.github/workflows/audit-moderate.yml');

  it('only sends mail when the SMTP secrets and a valid sender are configured', () => {
    expect(workflow).toContain('id: mail-config');
    expect(workflow).toContain("if: failure() && steps.mail-config.outputs.configured == 'true'");
    expect(workflow).toMatch(/from: "Security Audit Bot <\$\{\{ secrets\.MAIL_FROM \|\| secrets\.SMTP_USERNAME \}\}>"/);
  });
});

describe('generated files stay out of the tracked tree', () => {
  it('points Lighthouse CI at the generated config in dist/', () => {
    expect(read('.github/workflows/main.yml')).toContain('configPath: "./dist/lighthouserc.json"');
    const base = JSON.parse(read('lighthouserc.json'));
    expect(base.ci.collect.url).toBeUndefined();
  });
});
