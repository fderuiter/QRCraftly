import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { validateAdrs } from '../scripts/validate_adrs.js';

const adr = (title: string, status = 'accepted') => `---\nstatus: ${status}\n---\n\n# ${title}\n\n## Context\n\nText.\n`;

describe('validate_adrs', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'adr-test-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const write = (name: string, content: string) => fs.writeFileSync(path.join(dir, name), content);

  it('passes on the real docs/adr directory', () => {
    expect(validateAdrs()).toEqual([]);
  });

  it('passes a gap-free sequence, with or without frontmatter', () => {
    write('0001-first.md', adr('First'));
    write('0002-second.md', '# Second\n\nNo frontmatter.\n');
    write('0003-third-decision.md', adr('Third', 'superseded'));
    expect(validateAdrs(dir)).toEqual([]);
  });

  it('accepts any sequence length, so a newly added ADR only needs the next number', () => {
    for (let n = 1; n <= 18; n++) {
      write(`${String(n).padStart(4, '0')}-decision-${n}.md`, adr(`Decision ${n}`));
    }
    expect(validateAdrs(dir)).toEqual([]);
  });

  it('flags gaps in the numbering', () => {
    write('0001-first.md', adr('First'));
    write('0003-third.md', adr('Third'));
    const problems = validateAdrs(dir);
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('0002 is missing');
    expect(problems[0].hint).toMatch(/Renumber|restore/);
  });

  it('flags duplicate numbers', () => {
    write('0001-first.md', adr('First'));
    write('0001-other.md', adr('Other'));
    const problems = validateAdrs(dir);
    expect(problems.map(p => p.message)).toContainEqual(expect.stringContaining('0001 is used by 2 files'));
  });

  it('flags malformed file names', () => {
    write('0001-first.md', adr('First'));
    write('2-Second_Decision.md', adr('Second'));
    const problems = validateAdrs(dir);
    expect(problems).toHaveLength(1);
    expect(problems[0].file).toBe('2-Second_Decision.md');
    expect(problems[0].hint).toContain('0019-my-decision.md');
  });

  it('flags an ADR without a level-one title heading', () => {
    write('0001-first.md', '---\nstatus: accepted\n---\n\n## Context\n\nNo title.\n');
    const problems = validateAdrs(dir);
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('title heading');
  });

  it('flags an unknown status', () => {
    write('0001-first.md', adr('First', 'maybe'));
    const problems = validateAdrs(dir);
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain("Unknown ADR status 'maybe'");
  });

  it('gives every problem a remediation hint', () => {
    write('0001-first.md', '## no title\n');
    write('0001-dup.md', adr('Dup', 'bogus'));
    write('0004-late.md', adr('Late'));
    write('bad.md', adr('Bad'));
    const problems = validateAdrs(dir);
    expect(problems.length).toBeGreaterThan(3);
    for (const problem of problems) {
      expect(problem.hint.length).toBeGreaterThan(10);
    }
  });
});
