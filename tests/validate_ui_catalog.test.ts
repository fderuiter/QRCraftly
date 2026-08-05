import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateCatalog, checkLineage, parseGitStatus, parseArgs, decodeGitPath } from '../scripts/validate_ui_catalog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempTestDir = path.join(__dirname, 'temp_validate_catalog_test');

describe('UI Catalog Validator and Lineage Sync Checks', () => {
  const mockUiDir = path.join(tempTestDir, 'ui');
  const mockCatalogPath = path.join(tempTestDir, 'UI_CATALOG.md');

  beforeAll(() => {
    fs.mkdirSync(tempTestDir, { recursive: true });
    fs.mkdirSync(mockUiDir, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(tempTestDir, { recursive: true, force: true });
  });

  describe('validateCatalog() Integrity Validation', () => {
    it('should pass validation when catalog perfectly matches disk files', () => {
      // Create mock UI component files
      fs.writeFileSync(path.join(mockUiDir, 'TestButton.tsx'), 'export const TestButton = () => <button />;');
      fs.writeFileSync(path.join(mockUiDir, 'TestButton.test.tsx'), '// test');
      fs.writeFileSync(path.join(mockUiDir, 'NoTestComp.tsx'), 'export const NoTestComp = () => <div />;');

      // Create a perfect mock catalog
      const mockCatalogContent = `
# UI Catalog
## 1. Core Shared UI Elements (\`src/components/ui/\`)
- **TestButton** (\`TestButton.tsx\` / \`TestButton.test.tsx\`): A fully accessible test button component with various states.
- **NoTestComp** (\`NoTestComp.tsx\`): Minimal container component designed without a test.
`;
      fs.writeFileSync(mockCatalogPath, mockCatalogContent);

      const errors = validateCatalog(mockUiDir, mockCatalogPath);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation when a UI component file is missing from catalog', () => {
      fs.writeFileSync(path.join(mockUiDir, 'MissingComp.tsx'), 'export const MissingComp = () => <div />;');

      const errors = validateCatalog(mockUiDir, mockCatalogPath);
      expect(errors).toContain("UI component 'MissingComp.tsx' is missing from the catalog (UI_CATALOG.md).");

      // Clean up
      fs.unlinkSync(path.join(mockUiDir, 'MissingComp.tsx'));
    });

    it('should fail validation when a companion test file exists on disk but is not in catalog entry', () => {
      // Add a test file for NoTestComp.tsx
      fs.writeFileSync(path.join(mockUiDir, 'NoTestComp.test.tsx'), '// test');

      const errors = validateCatalog(mockUiDir, mockCatalogPath);
      expect(errors).toContain("UI component 'NoTestComp.tsx' has a companion test file 'NoTestComp.test.tsx' on disk, but it is not referenced in the catalog entry.");

      // Clean up
      fs.unlinkSync(path.join(mockUiDir, 'NoTestComp.test.tsx'));
    });

    it('should fail validation when catalog entry has an insufficient functional description', () => {
      // Rewrite catalog with too short description (less than 10 characters)
      const badCatalogContent = `
# UI Catalog
- **TestButton** (\`TestButton.tsx\` / \`TestButton.test.tsx\`): Short.
- **NoTestComp** (\`NoTestComp.tsx\`): Minimal container component designed without a test.
`;
      fs.writeFileSync(mockCatalogPath, badCatalogContent);

      const errors = validateCatalog(mockUiDir, mockCatalogPath);
      expect(errors).toContain("UI component 'TestButton.tsx' has an insufficient or missing functional description (must be at least 10 characters).");
    });

    it('should fail validation when catalog entry has invalid format without "):" delimiter', () => {
      const badCatalogContent = `
# UI Catalog
- **TestButton** (\`TestButton.tsx\` / \`TestButton.test.tsx\`) lacks colon description
- **NoTestComp** (\`NoTestComp.tsx\`): Minimal container component designed without a test.
`;
      fs.writeFileSync(mockCatalogPath, badCatalogContent);

      const errors = validateCatalog(mockUiDir, mockCatalogPath);
      expect(errors).toContain("UI component 'TestButton.tsx' catalog entry is missing or incorrectly formatted (expected '):' before description).");
    });
  });

  describe('checkLineage() Git History Checks', () => {
    it('should fail validation when a UI component file is modified without the catalog file', () => {
      const modified = new Set(['src/components/ui/Accordion.tsx']);
      const missing = checkLineage(modified);

      expect(missing).toHaveLength(1);
      expect(missing[0]).toEqual({
        codeFile: 'src/components/ui/Accordion.tsx',
        catalogFile: 'docs/public/UI_CATALOG.md'
      });
    });

    it('should fail validation when a UI component companion test file is modified without the catalog file', () => {
      const modified = new Set(['src/components/ui/Accordion.test.tsx']);
      const missing = checkLineage(modified);

      expect(missing).toHaveLength(1);
      expect(missing[0]).toEqual({
        codeFile: 'src/components/ui/Accordion.test.tsx',
        catalogFile: 'docs/public/UI_CATALOG.md'
      });
    });

    it('should pass validation when both a UI component file and the catalog file are modified together', () => {
      const modified = new Set(['src/components/ui/Accordion.tsx', 'docs/public/UI_CATALOG.md']);
      const missing = checkLineage(modified);

      expect(missing).toHaveLength(0);
    });

    it('should pass validation when no UI component files are modified', () => {
      const modified = new Set(['src/utils/colorUtils.ts', 'src/components/inputs/TextInput.tsx']);
      const missing = checkLineage(modified);

      expect(missing).toHaveLength(0);
    });

    it('should ignore non-component/utility scripts in src/components/ui/', () => {
      const modified = new Set(['src/components/ui/styles.ts']);
      const missing = checkLineage(modified);

      expect(missing).toHaveLength(0);
    });
  });

  describe('Git Status Output and Argument Parsing', () => {
    it('should parse git status porcelain output correctly', () => {
      const mockStdout = ` M src/components/ui/Button.tsx\n?? src/components/ui/NewComp.tsx\n R  old.tsx -> src/components/ui/Renamed.tsx`;
      const parsed = parseGitStatus(mockStdout);

      expect(parsed.has('src/components/ui/Button.tsx')).toBe(true);
      expect(parsed.has('src/components/ui/NewComp.tsx')).toBe(true);
      expect(parsed.has('src/components/ui/Renamed.tsx')).toBe(true);
    });

    it('should parse command-line arguments and filter non-existing or space-separated files correctly', () => {
      const args = ['--verbose', 'src/components/ui/Button.tsx', 'docs/public/UI_CATALOG.md'];
      const parsed = parseArgs(args);

      expect(parsed).toContain('src/components/ui/Button.tsx');
      expect(parsed).toContain('docs/public/UI_CATALOG.md');
    });

    it('should decode octal escape sequences in git path decoding', () => {
      const encoded = '"src/components/ui/sh\\303\\251.tsx"';
      const decoded = decodeGitPath(encoded);
      expect(decoded).toBe('src/components/ui/shé.tsx');
    });
  });
});
