import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseFrontmatter } from './compile_docs_manifest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.join(__dirname, '..');

export const DEFAULT_ADR_DIR = path.join(repoRoot, 'docs', 'adr');

/** ADR files are named `NNNN-kebab-case-title.md`. */
export const ADR_FILENAME_PATTERN = /^(\d{4})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;

/** Allowed values for the optional `status` frontmatter field. */
export const ADR_STATUSES = ['proposed', 'accepted', 'deprecated', 'superseded'];

/** Non-ADR files that may live next to the ADRs. */
const IGNORED_FILES = new Set(['README.md', 'TEMPLATE.md', 'template.md']);

/**
 * Validates the ADR directory: file naming, gap-free and duplicate-free numbering
 * starting at 0001, a level-one title heading in each file, and a known status.
 *
 * @param {string} [adrDir] Directory holding the ADR Markdown files.
 * @returns {Array<{ file: string, message: string, hint: string }>} One entry per problem found.
 */
export function validateAdrs(adrDir = DEFAULT_ADR_DIR) {
  const problems = [];
  if (!fs.existsSync(adrDir)) {
    return [{
      file: 'docs/adr',
      message: 'ADR directory does not exist.',
      hint: 'Create docs/adr/ and add ADRs named NNNN-short-title.md.'
    }];
  }

  const files = fs.readdirSync(adrDir, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.md') && !IGNORED_FILES.has(entry.name))
    .map(entry => entry.name)
    .sort();

  /** @type {Map<number, string[]>} */
  const byNumber = new Map();

  for (const file of files) {
    const match = ADR_FILENAME_PATTERN.exec(file);
    if (!match) {
      problems.push({
        file,
        message: 'File name does not follow the NNNN-short-title.md pattern.',
        hint: 'Rename it to a four-digit number, a hyphen and a lowercase kebab-case title, e.g. 0019-my-decision.md.'
      });
      continue;
    }

    const number = Number(match[1]);
    byNumber.set(number, [...(byNumber.get(number) ?? []), file]);

    const content = fs.readFileSync(path.join(adrDir, file), 'utf-8');
    const { frontmatter, body } = parseFrontmatter(content);

    const firstHeading = body.split(/\r?\n/).find(line => /^#{1,6}\s/.test(line));
    if (!firstHeading || !/^#\s+\S/.test(firstHeading)) {
      problems.push({
        file,
        message: 'ADR has no level-one title heading before its first section.',
        hint: "Start the body (after any frontmatter) with a '# Decision title' heading."
      });
    }

    if (frontmatter.status !== undefined) {
      const status = String(frontmatter.status).toLowerCase();
      if (!ADR_STATUSES.includes(status)) {
        problems.push({
          file,
          message: `Unknown ADR status '${frontmatter.status}'.`,
          hint: `Use one of: ${ADR_STATUSES.join(', ')}.`
        });
      }
    }
  }

  for (const [number, names] of byNumber) {
    if (names.length > 1) {
      problems.push({
        file: names.join(', '),
        message: `ADR number ${String(number).padStart(4, '0')} is used by ${names.length} files.`,
        hint: 'Give the newer ADR the next free number (the highest existing number + 1).'
      });
    }
  }

  const numbers = [...byNumber.keys()];
  const max = numbers.length > 0 ? Math.max(...numbers) : 0;
  for (let expected = 1; expected <= max; expected++) {
    if (!byNumber.has(expected)) {
      problems.push({
        file: 'docs/adr',
        message: `ADR number ${String(expected).padStart(4, '0')} is missing; numbering must have no gaps up to ${String(max).padStart(4, '0')}.`,
        hint: 'Renumber the ADRs after the gap, or restore the missing ADR (supersede it instead of deleting it).'
      });
    }
  }

  return problems;
}

function main() {
  const problems = validateAdrs();
  if (problems.length > 0) {
    for (const { file, message, hint } of problems) {
      console.error(`Error in docs/adr (${file}): ${message}\n  Fix: ${hint}`);
    }
    process.exit(1);
  }
  console.log('ADR validation passed successfully.');
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(__filename)) {
  main();
}
