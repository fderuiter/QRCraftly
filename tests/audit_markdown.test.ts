import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import { slugify, checkPlaceholders, buildFileHeadings, verifyLinks, validateTelemetryCompliance, resetErrors, checkCodeSnippets } from '../scripts/audit_markdown.js';

describe('audit_markdown', () => {
  beforeEach(() => {
    resetErrors();
  });

  describe('slugify', () => {
    it('should lower case and replace spaces with hyphens', () => {
      expect(slugify('My Heading Title')).toBe('my-heading-title');
    });

    it('should strip HTML tags', () => {
      expect(slugify('Heading <span class="badge">New</span>')).toBe('heading-new');
    });

    it('should remove non-word characters except hyphens', () => {
      expect(slugify('Hello World! @2026')).toBe('hello-world-2026');
    });
  });

  describe('checkPlaceholders', () => {
    it('should detect TODO and FIXME', () => {
      expect(checkPlaceholders('test.md', 'This is a TODO item')).toBe(true);
      expect(checkPlaceholders('test.md', 'Please FIXME immediately')).toBe(true);
    });

    it('should pass when no placeholders are present', () => {
      expect(checkPlaceholders('test.md', 'This is clean text with no markers')).toBe(false);
    });
  });

  describe('buildFileHeadings', () => {
    it('should extract and slugify headings', () => {
      const content = '# Introduction\n## Installation Guide\n### API Reference';
      const headings = buildFileHeadings('test.md', content);
      expect(headings.has('introduction')).toBe(true);
      expect(headings.has('installation-guide')).toBe(true);
      expect(headings.has('api-reference')).toBe(true);
    });
  });

  describe('verifyLinks', () => {
    let existsSpy;

    beforeEach(() => {
      existsSpy = vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
        if (typeof p === 'string') {
          if (p.endsWith('missing.md')) return false;
          return true;
        }
        return false;
      });
    });

    afterEach(() => {
      existsSpy.mockRestore();
    });

    it('should ignore external links', () => {
      const content = '[Google](https://google.com) [Mail](mailto:test@example.com)';
      const fileHeadings = { 'test.md': new Set() };
      const hasLinkErrors = verifyLinks('test.md', content, fileHeadings);
      expect(hasLinkErrors).toBe(false);
    });

    it('should validate internal hash links inside the same file', () => {
      const content = '[Anchor Link](#my-anchor)';
      const fileHeadings = {
        'test.md': new Set(['my-anchor'])
      };
      
      const hasLinkErrors = verifyLinks('test.md', content, fileHeadings);
      expect(hasLinkErrors).toBe(false);
    });

    it('should flag internal hash links when anchor does not exist', () => {
      const content = '[Anchor Link](#missing-anchor)';
      const fileHeadings = {
        'test.md': new Set(['my-anchor'])
      };
      
      const hasLinkErrors = verifyLinks('test.md', content, fileHeadings);
      expect(hasLinkErrors).toBe(true);
    });

    it('should validate relative file links and check existence', () => {
      const content = '[About](../about.md)';
      const fileHeadings = {};

      const hasLinkErrors = verifyLinks('test.md', content, fileHeadings);
      expect(hasLinkErrors).toBe(false);
    });

    it('should flag relative file links when file does not exist', () => {
      const content = '[About](../missing.md)';
      const fileHeadings = {};

      const hasLinkErrors = verifyLinks('test.md', content, fileHeadings);
      expect(hasLinkErrors).toBe(true);
    });
  });

  describe('validateTelemetryCompliance', () => {
    it('should pass compliance match when keys match perfectly', () => {
      const typesContent = `export const ALLOWED_TELEMETRY_KEYS = ['key_one', 'key_two'];`;
      const complianceContent = `
# Opt-In Telemetry
These keys are supported: \`key_one\`, \`key_two\`.

## What is NOT Logged
No private info.
`;
      const hasErrors = validateTelemetryCompliance(complianceContent, typesContent);
      expect(hasErrors).toBe(false);
    });

    it('should fail when code key is not documented', () => {
      const typesContent = `export const ALLOWED_TELEMETRY_KEYS = ['key_one', 'key_undocumented'];`;
      const complianceContent = `
# Opt-In Telemetry
These keys are supported: \`key_one\`.

## What is NOT Logged
No private info.
`;
      const hasErrors = validateTelemetryCompliance(complianceContent, typesContent);
      expect(hasErrors).toBe(true);
    });

    it('should fail when documented key is not in code', () => {
      const typesContent = `export const ALLOWED_TELEMETRY_KEYS = ['key_one'];`;
      const complianceContent = `
# Opt-In Telemetry
These keys are supported: \`key_one\`, \`key_undocumented_in_code\`.

## What is NOT Logged
No private info.
`;
      const hasErrors = validateTelemetryCompliance(complianceContent, typesContent);
      expect(hasErrors).toBe(true);
    });
  });

  describe('checkCodeSnippets', () => {
    const tempFile = 'temp_test_snippets.md';

    afterEach(() => {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    });

    it('should pass when code snippets compile successfully', () => {
      fs.writeFileSync(
        tempFile,
        '```ts\nconst val: number = 42;\nconsole.log(val);\n```',
        'utf-8'
      );
      const hasErrors = checkCodeSnippets([tempFile]);
      expect(hasErrors).toBe(false);
    });

    it('should fail when code snippets contain compilation errors', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      fs.writeFileSync(
        tempFile,
        '```ts\nconst val: number = "not a number";\n```',
        'utf-8'
      );
      const hasErrors = checkCodeSnippets([tempFile]);
      expect(hasErrors).toBe(true);
      consoleSpy.mockRestore();
    });
  });
});
