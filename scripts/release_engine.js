#!/usr/bin/env node
/**
 * scripts/release_engine.js
 *
 * Cross-platform ESM release engine for QRCraftly.
 *
 * Modes (see RELEASING.md for the full flow):
 *   --dry-run            Preview next version + changelog, exit 0 (no side effects)
 *   --generate-changelog Write CHANGELOG.md and update package.json version
 *   --prepare            From an up-to-date main: create release/vX.Y.Z, write the
 *                        changelog + version, and commit `chore(release): vX.Y.Z`
 *                        (open it as a PR into main; merging it makes the Release
 *                        workflow tag vX.Y.Z and publish the GitHub Release)
 *   --notes <version>    Print the CHANGELOG.md section for <version> (release notes)
 *
 *   --bump=major|minor|patch overrides the computed bump for --dry-run,
 *   --generate-changelog and --prepare.
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

/**
 * Compares two versions. Returns a positive number when a is newer than b.
 *
 * @param {{ major: number, minor: number, patch: number }} a
 * @param {{ major: number, minor: number, patch: number }} b
 * @returns {number}
 */
export function compareVersions(a, b) {
  return a.major - b.major || a.minor - b.minor || a.patch - b.patch;
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

const FIELD_SEP = '\x1f';
const RECORD_SEP = '\x1e';
const GIT_LOG_FORMAT = `%H${FIELD_SEP}%an${FIELD_SEP}%s${FIELD_SEP}%b${RECORD_SEP}`;

/**
 * Parses `git log --format=GIT_LOG_FORMAT` output. Records are split on a record
 * separator, not on newlines, because commit bodies span several lines.
 *
 * @param {string} raw
 * @returns {Commit[]}
 */
export function parseGitLog(raw) {
  return raw
    .split(RECORD_SEP)
    .map(record => record.replace(/^\r?\n/, ''))
    .filter(record => record.trim().length > 0)
    .map(record => {
      const [hash, author, subject, body] = record.split(FIELD_SEP);
      return {
        hash: (hash ?? '').trim(),
        author: (author ?? '').trim(),
        subject: (subject ?? '').trim(),
        body: (body ?? '').replace(/\r\n/g, '\n').trim(),
      };
    });
}

/**
 * Returns commits between fromRef (exclusive) and HEAD (inclusive).
 *
 * @param {string|null} fromRef  If null, all commits since beginning.
 * @returns {Commit[]}
 */
function getCommitsSince(fromRef) {
  const range = fromRef ? `${fromRef}..HEAD` : 'HEAD';
  const raw = execBinary('git', ['log', range, `--format=${GIT_LOG_FORMAT}`, '--no-merges']);
  return parseGitLog(raw);
}

// ---------------------------------------------------------------------------
// Core computation
// ---------------------------------------------------------------------------

/**
 * @param {'major'|'minor'|'patch'|null} [bumpOverride]
 * @returns {{ latestTag: string|null; currentVersion: {major:number,minor:number,patch:number}; bump: string|null; nextVersion: string; commits: Commit[]; groups: ReturnType<typeof groupCommits>; date: string }}
 */
function computeRelease(bumpOverride = null) {
  const latestTag = getLatestTag();
  const currentVersion = latestTag
    ? parseTagVersion(latestTag)
    : { major: 0, minor: 0, patch: 0 };
  const commits = getCommitsSince(latestTag);
  const bump = bumpOverride ?? computeNextBump(commits);
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

  fs.writeFileSync(changelogPath, insertChangelogSection(existing, section), 'utf8');
}

/**
 * Inserts a release section below the `## [Unreleased]` heading and above the
 * newest released version, keeping the `---` separators the changelog uses.
 *
 * @param {string} existing  Current CHANGELOG.md content ('' when missing)
 * @param {string} section   Section produced by formatChangelogSection
 * @returns {string}
 */
export function insertChangelogSection(existing, section) {
  const defaultHeader =
    '# Changelog\n\n' +
    'All notable changes to this project will be documented in this file.\n\n' +
    'The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),\n' +
    'and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).\n\n' +
    '## [Unreleased]\n';
  const content = (existing || defaultHeader).replace(/\r\n/g, '\n');

  const released = /^## \[(?!Unreleased\])/m.exec(content);
  if (released) {
    return content.slice(0, released.index) + section + '\n\n---\n\n' + content.slice(released.index);
  }
  return content.replace(/\n*$/, '\n\n') + section + '\n';
}

/**
 * Returns the CHANGELOG.md section for a version, without its heading, for use as
 * GitHub Release notes.
 *
 * @param {string} changelog
 * @param {string} version
 * @returns {string|null}
 */
export function extractReleaseNotes(changelog, version) {
  const lines = changelog.split(/\r?\n/);
  const start = lines.findIndex(line => line.startsWith(`## [${version}]`));
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex(line => line.startsWith('## [') || line.trim() === '---');
  return (end === -1 ? rest : rest.slice(0, end)).join('\n').trim();
}


// ---------------------------------------------------------------------------
// CLI entry point — only executes when run directly (not when imported by tests)
// ---------------------------------------------------------------------------

/**
 * Runs git and returns trimmed stdout, or null when the command fails.
 *
 * @param {string[]} args
 * @returns {string|null}
 */
function tryGit(args) {
  try {
    return execBinary('git', args).trim();
  } catch {
    return null;
  }
}

/**
 * Exits with a message when the condition does not hold.
 *
 * @param {boolean} ok
 * @param {string} message
 */
function ensure(ok, message) {
  if (!ok) {
    console.error(`\n${message}\n`);
    process.exit(1);
  }
}

/**
 * Checks the local clone is on a clean main that matches origin/main.
 */
function ensureCleanUpToDateMain() {
  const branch = tryGit(['branch', '--show-current']);
  ensure(branch === 'main', `Run this from the 'main' branch (currently on '${branch}').`);
  ensure(tryGit(['status', '--porcelain']) === '', 'Working tree is not clean. Commit or stash your changes first.');
  ensure(tryGit(['fetch', 'origin', 'main', '--tags']) !== null, 'Could not fetch from origin.');
  ensure(
    tryGit(['rev-parse', 'HEAD']) === tryGit(['rev-parse', 'origin/main']),
    "Local main does not match origin/main. Run 'git pull --ff-only origin main' first."
  );
}

/**
 * @param {string[]} args
 * @returns {'major'|'minor'|'patch'|null}
 */
function parseBumpFlag(args) {
  const flag = args.find(a => a.startsWith('--bump='));
  if (!flag) return null;
  const value = flag.slice('--bump='.length);
  ensure(['major', 'minor', 'patch'].includes(value), `Invalid --bump value '${value}'. Use major, minor or patch.`);
  return /** @type {'major'|'minor'|'patch'} */ (value);
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url).replace(/\\/g, '/') === process.argv[1].replace(/\\/g, '/');

if (isMain) {
  const args = process.argv.slice(2);
  const mode = ['--dry-run', '--generate-changelog', '--prepare', '--notes'].find(m => args.includes(m));

  if (!mode) {
    console.error(
      'Usage: node scripts/release_engine.js [--dry-run | --generate-changelog | --prepare | --notes <version>] [--bump=major|minor|patch]'
    );
    process.exit(1);
  }

  const changelogPath = path.join(repoRoot, 'CHANGELOG.md');
  const readChangelog = () => (fs.existsSync(changelogPath) ? fs.readFileSync(changelogPath, 'utf8') : '');

  if (mode === '--notes') {
    const version = (args[args.indexOf('--notes') + 1] ?? '').replace(/^v/, '');
    const notes = extractReleaseNotes(readChangelog(), version);
    ensure(notes !== null, `CHANGELOG.md has no section for ${version}.`);
    process.stdout.write((notes || `Release v${version}`) + '\n');
    process.exit(0);
  }

  const release = computeRelease(parseBumpFlag(args));

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

  if (mode === '--dry-run') {
    console.log('\nDry run complete -- no files modified.\n');
    process.exit(0);
  }

  if (mode === '--prepare') {
    ensureCleanUpToDateMain();
    ensure(release.commits.length > 0, `Nothing to release: no commits since ${release.latestTag}.`);
    const branch = `release/v${release.nextVersion}`;
    ensure(tryGit(['rev-parse', '-q', '--verify', `refs/heads/${branch}`]) === null, `Branch ${branch} already exists.`);
    execBinary('git', ['checkout', '-b', branch]);
  }

  updatePackageJsonVersion(release.nextVersion);
  prependChangelog(section, release.nextVersion);
  console.log(`\nUpdated package.json -> ${release.nextVersion}`);
  console.log('Updated CHANGELOG.md\n');

  if (mode === '--prepare') {
    execBinary('git', ['add', 'CHANGELOG.md', 'package.json']);
    execBinary('git', ['commit', '-m', `chore(release): v${release.nextVersion}`]);
    console.log(`Committed chore(release): v${release.nextVersion} on ${`release/v${release.nextVersion}`}.`);
    console.log('Next: edit CHANGELOG.md if needed, push the branch, and open a PR into main.');
    console.log('Squash-merge it once CI is green; the Release workflow then tags and publishes it.\n');
  }
  process.exit(0);
}
