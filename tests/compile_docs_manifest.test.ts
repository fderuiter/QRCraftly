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
      
      // We expect only 2 documents to compile: public-doc and explicit-public-doc
      expect(compiledData).toHaveLength(2);

      const ids = compiledData.map((doc: { id: string }) => doc.id);
      expect(ids).toContain('public-doc');
      expect(ids).toContain('explicit-public-doc');
      expect(ids).not.toContain('draft-doc');
      expect(ids).not.toContain('quoted-draft-doc');

      // Verify content has frontmatter stripped for explicit-public-doc
      const explicitPub = compiledData.find((doc: { id: string }) => doc.id === 'explicit-public-doc');
      expect(explicitPub.title).toBe('Explicit Public Document');
      expect(explicitPub.content).not.toContain('draft: false');
      expect(explicitPub.content).toContain('# Explicit Public Document');
    });
  });
});
