import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the pure, exported functions from release_engine.js
import {
  parseTagVersion,
  applyBump,
  computeNextBump,
  groupCommits,
  formatChangelogSection,
} from '../scripts/release_engine.js';

// ---------------------------------------------------------------------------
// parseTagVersion
// ---------------------------------------------------------------------------
describe('parseTagVersion', () => {
  it('should parse standard 3-part SemVer tags', () => {
    expect(parseTagVersion('v0.8.0')).toEqual({ major: 0, minor: 8, patch: 0 });
    expect(parseTagVersion('v1.2.3')).toEqual({ major: 1, minor: 2, patch: 3 });
    expect(parseTagVersion('0.6.1')).toEqual({ major: 0, minor: 6, patch: 1 });
  });

  it('should normalise legacy 4-digit tags by dropping the 4th digit', () => {
    expect(parseTagVersion('v0.7.0.3')).toEqual({ major: 0, minor: 7, patch: 0 });
    expect(parseTagVersion('v0.6.3.1')).toEqual({ major: 0, minor: 6, patch: 3 });
    expect(parseTagVersion('v0.7.0.0')).toEqual({ major: 0, minor: 7, patch: 0 });
  });

  it('should handle tags without v prefix', () => {
    expect(parseTagVersion('1.0.0')).toEqual({ major: 1, minor: 0, patch: 0 });
  });
});

// ---------------------------------------------------------------------------
// applyBump
// ---------------------------------------------------------------------------
describe('applyBump', () => {
  const base = { major: 0, minor: 7, patch: 3 };

  it('should bump patch correctly', () => {
    expect(applyBump(base, 'patch')).toBe('0.7.4');
  });

  it('should bump minor correctly (resetting patch)', () => {
    expect(applyBump(base, 'minor')).toBe('0.8.0');
  });

  it('should bump major correctly (resetting minor and patch)', () => {
    expect(applyBump(base, 'major')).toBe('1.0.0');
  });

  it('should bump major from 0.0.0 correctly', () => {
    expect(applyBump({ major: 0, minor: 0, patch: 0 }, 'major')).toBe('1.0.0');
  });
});

// ---------------------------------------------------------------------------
// computeNextBump
// ---------------------------------------------------------------------------
describe('computeNextBump', () => {
  const commit = (subject, body = '') => ({ subject, body, hash: 'abc1234', author: 'test' });

  it('should return null for empty commit list', () => {
    expect(computeNextBump([])).toBeNull();
  });

  it('should return patch for fix: commits', () => {
    expect(computeNextBump([commit('fix(auth): correct token refresh')])).toBe('patch');
  });

  it('should return patch for perf: commits', () => {
    expect(computeNextBump([commit('perf(worker): reduce allocation')])).toBe('patch');
  });

  it('should return patch for chore: commits', () => {
    expect(computeNextBump([commit('chore(deps): bump vite to 6')])).toBe('patch');
  });

  it('should return patch for docs: commits', () => {
    expect(computeNextBump([commit('docs(readme): update installation steps')])).toBe('patch');
  });

  it('should return minor for feat: commits', () => {
    expect(computeNextBump([commit('feat(qr): add logo embedding support')])).toBe('minor');
  });

  it('should return minor for mixed fix+feat (highest wins)', () => {
    expect(computeNextBump([
      commit('fix(auth): token expiry'),
      commit('feat(qr): logo embedding'),
    ])).toBe('minor');
  });

  it('should return major for feat!: (breaking shorthand)', () => {
    expect(computeNextBump([commit('feat!: remove legacy URL param support')])).toBe('major');
  });

  it('should return major for fix!: (breaking shorthand)', () => {
    expect(computeNextBump([commit('fix!: drop IE11 polyfills')])).toBe('major');
  });

  it('should return major for BREAKING CHANGE: in subject', () => {
    expect(computeNextBump([commit('BREAKING CHANGE: storage key renamed')])).toBe('major');
  });

  it('should return major for BREAKING CHANGE: in body', () => {
    expect(computeNextBump([
      commit('feat(qr): redesign core API', 'BREAKING CHANGE: QROptions.size renamed to QROptions.dimension')
    ])).toBe('major');
  });

  it('should short-circuit at major even if later commits are minor', () => {
    expect(computeNextBump([
      commit('feat!: breaking change'),
      commit('feat: new feature'),
      commit('fix: bugfix'),
    ])).toBe('major');
  });
});

// ---------------------------------------------------------------------------
// groupCommits
// ---------------------------------------------------------------------------
describe('groupCommits', () => {
  const commit = (subject, body = '') => ({ subject, body, hash: 'abc1234', author: 'test' });

  it('should group feat commits into features', () => {
    const c = commit('feat(qr): add logo support');
    const groups = groupCommits([c]);
    expect(groups.features).toContain(c);
    expect(groups.fixes.length).toBe(0);
  });

  it('should group fix commits into fixes', () => {
    const c = commit('fix(auth): token refresh');
    const groups = groupCommits([c]);
    expect(groups.fixes).toContain(c);
    expect(groups.features.length).toBe(0);
  });

  it('should group perf commits into performance', () => {
    const c = commit('perf(worker): zero-copy buffers');
    const groups = groupCommits([c]);
    expect(groups.performance).toContain(c);
  });

  it('should group chore, docs, refactor, test, ci, build commits into other', () => {
    const subjects = [
      'chore(deps): bump vite',
      'docs(adr): add ADR 0015',
      'refactor(qr): extract renderer',
      'test(unit): add coverage',
      'ci(actions): pin action versions',
      'build(vite): update config',
    ];
    for (const subject of subjects) {
      const c = commit(subject);
      const groups = groupCommits([c]);
      expect(groups.other).toContain(c);
    }
  });

  it('should group breaking change commits into breaking', () => {
    const c = commit('feat!: remove legacy API');
    const groups = groupCommits([c]);
    expect(groups.breaking).toContain(c);
    expect(groups.features.length).toBe(0);
  });

  it('should group commits with BREAKING CHANGE in body into breaking', () => {
    const c = commit('feat(qr): redesign API', 'BREAKING CHANGE: renamed options');
    const groups = groupCommits([c]);
    expect(groups.breaking).toContain(c);
  });

  it('should handle unknown commit types in other', () => {
    const c = commit('wip: experimenting');
    const groups = groupCommits([c]);
    expect(groups.other).toContain(c);
  });
});

// ---------------------------------------------------------------------------
// formatChangelogSection
// ---------------------------------------------------------------------------
describe('formatChangelogSection', () => {
  const mkCommit = (subject) => ({ subject, hash: 'a1b2c3d4e5f6', author: 'alice', body: '' });

  it('should produce a section header with version and date', () => {
    const result = formatChangelogSection('0.8.0', '2026-09-03', { breaking: [], features: [], fixes: [], performance: [], other: [] });
    expect(result).toContain('## [0.8.0] - 2026-09-03');
  });

  it('should include Features section for feat commits', () => {
    const groups = { breaking: [], features: [mkCommit('feat(qr): add logo')], fixes: [], performance: [], other: [] };
    const result = formatChangelogSection('0.8.0', '2026-09-03', groups);
    expect(result).toContain('### Features');
    expect(result).toContain('feat(qr): add logo');
    expect(result).toContain('`a1b2c3d`');
  });

  it('should include Bug Fixes section for fix commits', () => {
    const groups = { breaking: [], features: [], fixes: [mkCommit('fix(auth): token')], performance: [], other: [] };
    const result = formatChangelogSection('0.8.0', '2026-09-03', groups);
    expect(result).toContain('### Bug Fixes');
    expect(result).toContain('fix(auth): token');
  });

  it('should include Breaking Changes section for breaking commits', () => {
    const groups = { breaking: [mkCommit('feat!: remove old API')], features: [], fixes: [], performance: [], other: [] };
    const result = formatChangelogSection('0.8.0', '2026-09-03', groups);
    expect(result).toContain('### Breaking Changes');
    expect(result).toContain('feat!: remove old API');
  });

  it('should not include empty sections', () => {
    const groups = { breaking: [], features: [mkCommit('feat: new feature')], fixes: [], performance: [], other: [] };
    const result = formatChangelogSection('0.8.0', '2026-09-03', groups);
    expect(result).not.toContain('### Bug Fixes');
    expect(result).not.toContain('### Performance');
    expect(result).not.toContain('### Maintenance');
  });

  it('should use short 7-char hash in output', () => {
    const groups = { breaking: [], features: [mkCommit('feat: short hash test')], fixes: [], performance: [], other: [] };
    const result = formatChangelogSection('0.8.0', '2026-09-03', groups);
    expect(result).toContain('`a1b2c3d`');
    expect(result).not.toContain('a1b2c3d4e5f6');
  });
});