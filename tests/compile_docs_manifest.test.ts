import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { compileManifest, parseFrontmatter, extractTitle } from '../scripts/compile_docs_manifest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.join(__dirname, '..');

describe('Metadata-Driven Frontmatter Filtering', () => {
  const tempDir = path.join(repoRoot, 'tests', 'temp_compile_test_dir');
  const tempManifestPath = path.join(tempDir, 'temp_docs_manifest.json');

  beforeAll(() => {
    // Set up test directory and mockup files
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });

    // 1. Standard public document with no frontmatter
    fs.writeFileSync(
      path.join(tempDir, 'public-doc.md'),
      `# Public Document\n\nThis is a standard public document content.`,
      'utf-8'
    );

    // 2. Public document with draft: false
    fs.writeFileSync(
      path.join(tempDir, 'explicit-public-doc.md'),
      `---\ndraft: false\ntitle: "Explicit Public"\n---\n# Explicit Public Document\n\nThis is a public document.`,
      'utf-8'
    );

    // 3. Draft document with draft: true
    fs.writeFileSync(
      path.join(tempDir, 'draft-doc.md'),
      `---\ndraft: true\n---\n# Draft Document\n\nThis should be excluded.`,
      'utf-8'
    );

    // 4. Draft document with draft: "true" (quoted string)
    fs.writeFileSync(
      path.join(tempDir, 'quoted-draft-doc.md'),
      `---\ndraft: "true"\n---\n# Quoted Draft Document\n\nThis should also be excluded.`,
      'utf-8'
    );

    // 5. Draft document with draft: yes
    fs.writeFileSync(
      path.join(tempDir, 'draft-yes-doc.md'),
      `---\ndraft: yes\n---\n# Draft Yes Document\n\nThis should be excluded.`,
      'utf-8'
    );

    // 6. Draft document with draft: true # review pending
    fs.writeFileSync(
      path.join(tempDir, 'draft-comment-doc.md'),
      `---\ndraft: true # review pending\n---\n# Draft Comment Document\n\nThis should be excluded.`,
      'utf-8'
    );

    // 7. Public document with draft: no
    fs.writeFileSync(
      path.join(tempDir, 'draft-no-doc.md'),
      `---\ndraft: no\ntitle: "Draft No"\n---\n# Draft No Document\n\nThis should be included.`,
      'utf-8'
    );
  });

  afterAll(() => {
    // Clean up test directory and mockup files
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('parseFrontmatter Unit tests', () => {
    it('should parse simple frontmatter correctly and return the body', () => {
      const input = `---\ndraft: true\ntitle: "Hello World"\n---\n# My Content`;
      const { frontmatter, body } = parseFrontmatter(input);
      expect(frontmatter.draft).toBe(true);
      expect(frontmatter.title).toBe('Hello World');
      expect(body.trim()).toBe('# My Content');
    });

    it('should return empty frontmatter and unchanged content if no frontmatter block is present', () => {
      const input = `# My Title\nSome content.`;
      const { frontmatter, body } = parseFrontmatter(input);
      expect(frontmatter).toEqual({});
      expect(body).toBe(input);
    });

    it('should parse single quoted and double quoted strings properly', () => {
      const input = `---\nsingle: 'single-quoted'\ndouble: "double-quoted"\n---\nContent`;
      const { frontmatter } = parseFrontmatter(input);
      expect(frontmatter.single).toBe('single-quoted');
      expect(frontmatter.double).toBe('double-quoted');
    });

    it('should strip trailing inline comments correctly', () => {
      const input = `---\ndraft: true # check this later\ntitle: "My Title #1" # inline comment\nauthor: 'Bob #2' # author comment\ntags: doc #\n---\nContent`;
      const { frontmatter } = parseFrontmatter(input);
      expect(frontmatter.draft).toBe(true);
      expect(frontmatter.title).toBe('My Title #1');
      expect(frontmatter.author).toBe('Bob #2');
      expect(frontmatter.tags).toBe('doc');
    });

    it('should map YAML truthy representations to boolean true for draft key', () => {
      const truthyVals = ['yes', 'YES', 'Yes', 'on', 'ON', 'On', '1', 'true', 'TRUE', 'True'];
      for (const val of truthyVals) {
        const input = `---\ndraft: ${val}\n---`;
        const { frontmatter } = parseFrontmatter(input);
        expect(frontmatter.draft).toBe(true);
      }
    });

    it('should map YAML falsy representations to boolean false for draft key', () => {
      const falsyVals = ['no', 'NO', 'No', 'off', 'OFF', 'Off', '0', 'false', 'FALSE', 'False'];
      for (const val of falsyVals) {
        const input = `---\ndraft: ${val}\n---`;
        const { frontmatter } = parseFrontmatter(input);
        expect(frontmatter.draft).toBe(false);
      }
    });

    it('should preserve non-draft metadata keys without altering their types', () => {
      const input = `---\ntitle: yes\nstatus: ON\nversion: 1\ntags: false\n---\nContent`;
      const { frontmatter } = parseFrontmatter(input);
      expect(frontmatter.title).toBe('yes');
      expect(frontmatter.status).toBe('ON');
      expect(frontmatter.version).toBe('1');
      expect(frontmatter.tags).toBe(false);
    });
  });

  describe('extractTitle Unit tests', () => {
    it('should extract title from the first heading line', () => {
      const body = `# Test Document Title\nSome body text.`;
      const title = extractTitle(body);
      expect(title).toBe('Test Document Title');
    });

    it('should return default title if no heading is present', () => {
      const body = `Some body text with no heading.`;
      const title = extractTitle(body);
      expect(title).toBe('Untitled Document');
    });
  });

  describe('Integration Compilation Pass', () => {
    it('should exclude draft documents and include public ones during compile pass', () => {
      // Execute compiling manifest pass using mockup folder
      compileManifest(tempDir, tempManifestPath);

      expect(fs.existsSync(tempManifestPath)).toBe(true);

      const compiledData = JSON.parse(fs.readFileSync(tempManifestPath, 'utf-8'));
      
      // We expect 3 documents to compile: public-doc, explicit-public-doc, draft-no-doc
      expect(compiledData).toHaveLength(3);

      const ids = compiledData.map((doc: { id: string }) => doc.id);
      expect(ids).toContain('public-doc');
      expect(ids).toContain('explicit-public-doc');
      expect(ids).toContain('draft-no-doc');
      
      expect(ids).not.toContain('draft-doc');
      expect(ids).not.toContain('quoted-draft-doc');
      expect(ids).not.toContain('draft-yes-doc');
      expect(ids).not.toContain('draft-comment-doc');

      // Verify content has frontmatter stripped for explicit-public-doc
      const explicitPub = compiledData.find((doc: { id: string }) => doc.id === 'explicit-public-doc');
      expect(explicitPub.title).toBe('Explicit Public Document');
      expect(explicitPub.content).not.toContain('draft: false');
      expect(explicitPub.content).toContain('# Explicit Public Document');
    });
  });

  describe('Strict Opt-In and Quarantine Isolation Pass', () => {
    it('should ignore all markdown files inside a quarantine or internal folder', () => {
      const quarantineDir = path.join(tempDir, 'quarantine');
      const internalDir = path.join(tempDir, 'internal');
      if (!fs.existsSync(quarantineDir)) fs.mkdirSync(quarantineDir, { recursive: true });
      if (!fs.existsSync(internalDir)) fs.mkdirSync(internalDir, { recursive: true });

      fs.writeFileSync(
        path.join(quarantineDir, 'quarantined-note.md'),
        `# Internal Note\nThis should be completely ignored.`,
        'utf-8'
      );
      fs.writeFileSync(
        path.join(internalDir, 'internal-note.md'),
        `# Secret Note\nThis should also be completely ignored.`,
        'utf-8'
      );

      // Execute compileManifest
      compileManifest(tempDir, tempManifestPath);

      const compiledData = JSON.parse(fs.readFileSync(tempManifestPath, 'utf-8'));
      const ids = compiledData.map((doc: { id: string }) => doc.id);
      expect(ids).not.toContain('quarantined-note');
      expect(ids).not.toContain('internal-note');
    });

    it('should successfully parse publish-approved property', () => {
      const input = `---\npublish-approved: true\ntitle: "Approved Doc"\n---\n# Approved Document`;
      const { frontmatter } = parseFrontmatter(input);
      expect(frontmatter['publish-approved']).toBe(true);
    });
  });
});
