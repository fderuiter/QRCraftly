#!/usr/bin/env node
/**
 * scripts/release_engine.js
 *
 * Cross-platform ESM release engine for QRCraftly.
 *
 * Modes:
 *   --dry-run            Preview next version + changelog, exit 0 (no side effects)
 *   --generate-changelog Write CHANGELOG.md and update package.json version
 *   --promote            Fast-forward main from dev, create annotated tag, push
 *
 * Conventional Commit types supported:
 *   feat:              -> minor bump
 *   fix: / perf:       -> patch bump
 *   refactor: / docs:
 *   / chore: / test:   -> patch bump
 *   BREAKING CHANGE:
 *   / feat!: / fix!:   -> major bump
 *
 * Platform invariants:
 *   - Uses execBinary from scripts/utils/execHelper.js for all git calls.
 *   - Splits all git output on /\r?\n/ (never raw split('\n')).
 *   - Uses POSIX forward-slash paths throughout.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execBinary } from './utils/execHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// SemVer utilities
// ---------------------------------------------------------------------------

/**
 * Normalises a raw tag string (possibly 4-digit legacy format) to a plain
 * "X.Y.Z" semver object.
 *
 * Examples:
 *   "v0.7.0.3" -> { major:0, minor:7, patch:0 }  (4th digit dropped)
 *   "v0.8.0"   -> { major:0, minor:8, patch:0 }
 *   "0.6.1"    -> { major:0, minor:6, patch:1 }
 *
 * @param {string} raw
 * @returns {{ major: number, minor: number, patch: number }}
 */
export function parseTagVersion(raw) {
  const cleaned = raw.replace(/^v/, '');
  const parts = cleaned.split('.').map(Number).filter(n => !isNaN(n));
  const [major = 0, minor = 0, patch = 0] = parts;
  return { major, minor, patch };
}

/**
 * Returns the next SemVer given a bump type.
 *
 * @param {{ major: number, minor: number, patch: number }} current
 * @param {'major'|'minor'|'patch'} bump
 * @returns {string} New version string like "1.0.0"
 */
export function applyBump(current, bump) {
  const { major, minor, patch } = current;
  if (bump === 'major') return `${major + 1}.0.0`;
  if (bump === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

// ---------------------------------------------------------------------------
// Commit parsing
// ---------------------------------------------------------------------------

const BREAKING_RE = /^(\w+)(\(.+\))?!:|^BREAKING[\s-]CHANGE:/i;
const FEAT_RE = /^feat(\(.+\))?:/i;
const FIX_RE = /^fix(\(.+\))?:/i;
const PERF_RE = /^perf(\(.+\))?:/i;
const REFACTOR_RE = /^refactor(\(.+\))?:/i;
const DOCS_RE = /^docs(\(.+\))?:/i;
const CHORE_RE = /^chore(\(.+\))?:/i;
const TEST_RE = /^test(\(.+\))?:/i;
const CI_RE = /^ci(\(.+\))?:/i;
const BUILD_RE = /^build(\(.+\))?:/i;

/**
 * Determine the SemVer bump type that a collection of commits requires.
 *
 * @param {Array<{subject: string, body: string}>} commits
 * @returns {'major'|'minor'|'patch'|null}
 */
export function computeNextBump(commits) {
  if (commits.length === 0) return null;
  let bump = 'patch';
  for (const { subject, body } of commits) {
    if (BREAKING_RE.test(subject) || (body && /BREAKING[\s-]CHANGE:/i.test(body))) {
      return 'major';
    }
    if (FEAT_RE.test(subject)) {
      bump = 'minor';
    }
  }
  return bump;
}

/**
 * @typedef {{ subject: string; hash: string; author: string; body: string }} Commit
 */

/**
 * Group commits by conventional type for the changelog.
 *
 * @param {Commit[]} commits
 * @returns {{ breaking: Commit[]; features: Commit[]; fixes: Commit[]; performance: Commit[]; other: Commit[] }}
 */
export function groupCommits(commits) {
  const groups = { breaking: [], features: [], fixes: [], performance: [], other: [] };
  for (const c of commits) {
    if (BREAKING_RE.test(c.subject) || /BREAKING[\s-]CHANGE:/i.test(c.body)) {
      groups.breaking.push(c);
    } else if (FEAT_RE.test(c.subject)) {
      groups.features.push(c);
    } else if (FIX_RE.test(c.subject)) {
      groups.fixes.push(c);
    } else if (PERF_RE.test(c.subject)) {
      groups.performance.push(c);
    } else if (
      REFACTOR_RE.test(c.subject) ||
      DOCS_RE.test(c.subject) ||
      CHORE_RE.test(c.subject) ||
      TEST_RE.test(c.subject) ||
      CI_RE.test(c.subject) ||
      BUILD_RE.test(c.subject)
    ) {
      groups.other.push(c);
    } else {
      groups.other.push(c);
    }
  }
  return groups;
}

/**
 * Format a changelog section for a single version.
 *
 * @param {string} version
 * @param {string} date  ISO date string YYYY-MM-DD
 * @param {ReturnType<typeof groupCommits>} groups
 * @returns {string}
 */
export function formatChangelogSection(version, date, groups) {
  const lines = [`## [${version}] - ${date}`];

  const renderCommit = (c) => {
    const shortHash = c.hash.slice(0, 7);
    return `- ${c.subject} (\`${shortHash}\`)`;
  };

  if (groups.breaking.length > 0) {
    lines.push('', '### Breaking Changes');
    groups.breaking.forEach(c => lines.push(renderCommit(c)));
  }
  if (groups.features.length > 0) {
    lines.push('', '### Features');
    groups.features.forEach(c => lines.push(renderCommit(c)));
  }
  if (groups.fixes.length > 0) {
    lines.push('', '### Bug Fixes');
    groups.fixes.forEach(c => lines.push(renderCommit(c)));
  }
  if (groups.performance.length > 0) {
    lines.push('', '### Performance');
    groups.performance.forEach(c => lines.push(renderCommit(c)));
  }
  if (groups.other.length > 0) {
    lines.push('', '### Maintenance');
    groups.other.forEach(c => lines.push(renderCommit(c)));
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Git helpers
// ---------------------------------------------------------------------------

/**
 * Returns the most recent tag reachable from HEAD, or null.
 *
 * @returns {string|null}
 */
function getLatestTag() {
  try {
    return execBinary('git', ['describe', '--tags', '--abbrev=0']).trim();
  } catch {
    return null;
  }
}

/**
 * Returns commits between fromRef (exclusive) and HEAD (inclusive).
 *
 * @param {string|null} fromRef  If null, all commits since beginning.
 * @returns {Commit[]}
 */
function getCommitsSince(fromRef) {
  const SEP = '\x1f';
  const fmt = `%H${SEP}%an${SEP}%s${SEP}%b`;
  const range = fromRef ? `${fromRef}..HEAD` : 'HEAD';
  const raw = execBinary('git', ['log', range, `--format=${fmt}`, '--no-merges']);
  return raw
    .split(/\r?\n/)
    .filter(Boolean)
    .map(line => {
      const [hash, author, subject, ...bodyParts] = line.split(SEP);
      return {
        hash: (hash ?? '').trim(),
        author: (author ?? '').trim(),
        subject: (subject ?? '').trim(),
        body: bodyParts.join('\n').trim(),
      };
    });
}

// ---------------------------------------------------------------------------
// Core computation
// ---------------------------------------------------------------------------

/**
 * @returns {{ latestTag: string|null; currentVersion: {major:number,minor:number,patch:number}; bump: string|null; nextVersion: string; commits: Commit[]; groups: ReturnType<typeof groupCommits>; date: string }}
 */
function computeRelease() {
  const latestTag = getLatestTag();
  const currentVersion = latestTag
    ? parseTagVersion(latestTag)
    : { major: 0, minor: 0, patch: 0 };
  const commits = getCommitsSince(latestTag);
  const bump = computeNextBump(commits);
  const nextVersion = applyBump(currentVersion, bump ?? 'patch');
  const groups = groupCommits(commits);
  const date = new Date().toISOString().slice(0, 10);
  return { latestTag, currentVersion, bump, nextVersion, commits, groups, date };
}

/**
 * Update package.json version field in-place, preserving formatting.
 *
 * @param {string} version
 */
function updatePackageJsonVersion(version) {
  const pkgPath = path.join(repoRoot, 'package.json');
  const content = fs.readFileSync(pkgPath, 'utf8');
  const updated = content.replace(/"version":\s*"[^"]*"/, `"version": "${version}"`);
  fs.writeFileSync(pkgPath, updated, 'utf8');
}

/**
 * Prepend a new version section to CHANGELOG.md (idempotent).
 *
 * @param {string} section
 * @param {string} [version]
 */
export function prependChangelog(section, version) {
  const changelogPath = path.join(repoRoot, 'CHANGELOG.md');
  const existing = fs.existsSync(changelogPath)
    ? fs.readFileSync(changelogPath, 'utf8')
    : '';

  if (version && existing.includes(`## [${version}]`)) {
    // Already contains an entry for this version
    return;
  }

  const HEADER_END_RE = /^(# .+?(?:\n.*)*?)(?=\n## \[)/m;
  const match = HEADER_END_RE.exec(existing);
  let newContent;
  if (match) {
    const splitAt = match.index + match[0].length;
    newContent = existing.slice(0, splitAt) + '\n\n' + section + '\n' + existing.slice(splitAt);
  } else {
    const defaultHeader =
      '# Changelog\n\n' +
      'All notable changes to this project will be documented in this file.\n\n' +
      'The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),\n' +
      'and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).\n';
    newContent = (existing || defaultHeader) + '\n' + section + '\n';
  }
  fs.writeFileSync(changelogPath, newContent, 'utf8');
}

// ---------------------------------------------------------------------------
// CLI entry point — only executes when run directly (not when imported by tests)
// ---------------------------------------------------------------------------

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url).replace(/\\/g, '/') === process.argv[1].replace(/\\/g, '/');

if (isMain) {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isGenerateChangelog = args.includes('--generate-changelog');
  const isPromote = args.includes('--promote');

  if (!isDryRun && !isGenerateChangelog && !isPromote) {
    console.error('Usage: node scripts/release_engine.js [--dry-run | --generate-changelog | --promote]');
    process.exit(1);
  }

  const release = computeRelease();

  console.log('\n Release Engine');
  console.log(`   Latest tag:      ${release.latestTag ?? '(none)'}`);
  console.log(`   Current version: ${release.currentVersion.major}.${release.currentVersion.minor}.${release.currentVersion.patch}`);
  console.log(`   Bump type:       ${release.bump ?? 'patch (no commits)'}`);
  console.log(`   Next version:    v${release.nextVersion}`);
  console.log(`   Commits:         ${release.commits.length} since ${release.latestTag ?? 'beginning'}\n`);

  const section = formatChangelogSection(release.nextVersion, release.date, release.groups);
  console.log('-'.repeat(60));
  console.log(section);
  console.log('-'.repeat(60));

  if (isDryRun) {
    console.log('\nDry run complete -- no files modified.\n');
    process.exit(0);
  }

  if (isGenerateChangelog) {
    updatePackageJsonVersion(release.nextVersion);
    prependChangelog(section, release.nextVersion);
    console.log(`\nUpdated package.json -> ${release.nextVersion}`);
    console.log('Prepended CHANGELOG.md\n');
    process.exit(0);
  }

  if (isPromote) {
    const currentBranch = execBinary('git', ['branch', '--show-current']).trim();
    if (currentBranch !== 'dev') {
      console.error(`\n--promote must be run from the 'dev' branch (currently on '${currentBranch}').\n`);
      process.exit(1);
    }

    const pkgPath = path.join(repoRoot, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const changelogPath = path.join(repoRoot, 'CHANGELOG.md');
    const changelog = fs.existsSync(changelogPath) ? fs.readFileSync(changelogPath, 'utf8') : '';

    const alreadyPrepared =
      pkg.version !== '0.0.0' && changelog.includes(`## [${pkg.version}]`);
    const targetVersion = alreadyPrepared ? pkg.version : release.nextVersion;

    // 1. Bump version + write changelog if not already prepared
    if (!alreadyPrepared) {
      updatePackageJsonVersion(targetVersion);
      prependChangelog(section, targetVersion);
    }

    // 2. Commit if there are changes to changelog or package.json
    const status = execBinary('git', ['status', '--porcelain']).trim();
    if (status.includes('CHANGELOG.md') || status.includes('package.json')) {
      execBinary('git', ['add', 'CHANGELOG.md', 'package.json']);
      execBinary('git', ['commit', '-m', `chore(release): v${targetVersion}`]);
    }

    // 3. Push to origin/dev, then fast-forward origin/main
    execBinary('git', ['push', 'origin', 'dev']);
    execBinary('git', ['push', 'origin', 'dev:main']);

    // 4. Tag
    const tagName = `v${targetVersion}`;
    try {
      execBinary('git', ['tag', '-a', tagName, '-m', `Release ${tagName}`]);
      execBinary('git', ['push', 'origin', tagName]);
      console.log(`Created and pushed tag ${tagName}`);
    } catch {
      console.log(`Tag ${tagName} already exists or was previously pushed.`);
    }

    console.log(`\nFast-forwarded origin/main to dev HEAD`);
    console.log(`Release v${targetVersion} successfully promoted!\n`);
    process.exit(0);
  }
}