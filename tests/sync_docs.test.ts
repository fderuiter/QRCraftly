import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { syncUICatalog, syncTelemetryCompliance, syncAll } from '../scripts/sync_docs.js';
import { validateCatalog } from '../scripts/validate_ui_catalog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultRepoRoot = path.join(__dirname, '..');
const tempTestDir = path.join(__dirname, 'temp_sync_docs_test');

describe('Documentation Synchronization Engine (docs:sync)', () => {
  const mockUiDir = path.join(tempTestDir, 'src/components/ui');
  const mockInputsDir = path.join(tempTestDir, 'src/components/inputs');
  const mockStyleControlsDir = path.join(tempTestDir, 'src/components/style-controls');
  const mockCatalogPath = path.join(tempTestDir, 'docs/public/UI_CATALOG.md');
  const mockTypesPath = path.join(tempTestDir, 'src/types.ts');
  const mockCompliancePath = path.join(tempTestDir, 'docs/public/COMPLIANCE.md');

  beforeAll(() => {
    fs.mkdirSync(mockUiDir, { recursive: true });
    fs.mkdirSync(mockInputsDir, { recursive: true });
    fs.mkdirSync(mockStyleControlsDir, { recursive: true });
    fs.mkdirSync(path.dirname(mockCatalogPath), { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(tempTestDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    // Reset test directory contents
    fs.readdirSync(mockUiDir).forEach(f => fs.rmSync(path.join(mockUiDir, f)));
    fs.readdirSync(mockInputsDir).forEach(f => fs.rmSync(path.join(mockInputsDir, f)));
    fs.readdirSync(mockStyleControlsDir).forEach(f => fs.rmSync(path.join(mockStyleControlsDir, f)));
  });

  describe('syncUICatalog()', () => {
    it('scaffolds missing components into the matching catalog section with test references', () => {
      // Setup mock components
      fs.writeFileSync(
        path.join(mockUiDir, 'ActionButton.tsx'),
        `/** A primary call-to-action button with loading states. */\nexport const ActionButton = () => <button />;`
      );
      fs.writeFileSync(path.join(mockUiDir, 'ActionButton.test.tsx'), `// test`);

      fs.writeFileSync(
        path.join(mockInputsDir, 'CustomUrlInput.tsx'),
        `export const CustomUrlInput = () => <input />;`
      );

      // Base catalog with only an existing dummy
      const initialCatalog = `---
publish-approved: true
---

# UI Catalog

## 1. Core Shared UI Elements (\`src/components/ui/\`)

- **ExistingModal** (\`ExistingModal.tsx\`): An existing modal component.

## 2. QR Input Form Panel Components (\`src/components/inputs/\`)

## 3. Styling & Customization Controls (\`src/components/style-controls/\`)

## 4. Shared Utilities & Renderers (\`src/utils/colorUtils.ts\`)
`;
      fs.writeFileSync(
        path.join(mockUiDir, 'ExistingModal.tsx'),
        `export const ExistingModal = () => <dialog />;`
      );
      fs.writeFileSync(mockCatalogPath, initialCatalog);

      const result = syncUICatalog(
        [mockUiDir, mockInputsDir, mockStyleControlsDir],
        mockCatalogPath,
        tempTestDir
      );

      expect(result.changed).toBe(true);

      const updatedCatalog = fs.readFileSync(mockCatalogPath, 'utf8');
      expect(updatedCatalog).toContain('**ActionButton** (`ActionButton.tsx` / `ActionButton.test.tsx`)');
      expect(updatedCatalog).toContain('A primary call-to-action button with loading states.');
      expect(updatedCatalog).toContain('**CustomUrlInput** (`CustomUrlInput.tsx`)');

      // Validate catalog integrity using validateCatalog validator
      const validationErrors = validateCatalog(
        [mockUiDir, mockInputsDir, mockStyleControlsDir],
        mockCatalogPath
      );
      expect(validationErrors).toHaveLength(0);
    });

    it('updates existing entries when a companion test file is added to disk', () => {
      fs.writeFileSync(path.join(mockUiDir, 'Card.tsx'), 'export const Card = () => <div />;');
      fs.writeFileSync(mockCatalogPath, `---
publish-approved: true
---

# UI Catalog

## 1. Core Shared UI Elements (\`src/components/ui/\`)

- **Card** (\`Card.tsx\`): Elegant card container with borders and shadow.

## 2. QR Input Form Panel Components (\`src/components/inputs/\`)

## 3. Styling & Customization Controls (\`src/components/style-controls/\`)

## 4. Shared Utilities & Renderers (\`src/utils/colorUtils.ts\`)
`);

      // Add a test file for Card on disk
      fs.writeFileSync(path.join(mockUiDir, 'Card.test.tsx'), '// card test');

      const result = syncUICatalog(
        [mockUiDir, mockInputsDir, mockStyleControlsDir],
        mockCatalogPath,
        tempTestDir
      );

      expect(result.changed).toBe(true);
      const updatedCatalog = fs.readFileSync(mockCatalogPath, 'utf8');
      expect(updatedCatalog).toContain('**Card** (`Card.tsx` / `Card.test.tsx`): Elegant card container with borders and shadow.');
    });

    it('is strictly idempotent when no components or tests have changed', () => {
      fs.writeFileSync(path.join(mockUiDir, 'Badge.tsx'), 'export const Badge = () => <span />;');
      fs.writeFileSync(path.join(mockUiDir, 'Badge.test.tsx'), '// test');

      const initialCatalog = `---
publish-approved: true
---

# UI Catalog

## 1. Core Shared UI Elements (\`src/components/ui/\`)

- **Badge** (\`Badge.tsx\` / \`Badge.test.tsx\`): Compact badge status indicator.

## 2. QR Input Form Panel Components (\`src/components/inputs/\`)

## 3. Styling & Customization Controls (\`src/components/style-controls/\`)

## 4. Shared Utilities & Renderers (\`src/utils/colorUtils.ts\`)
`;
      fs.writeFileSync(mockCatalogPath, initialCatalog);

      const firstPass = syncUICatalog(
        [mockUiDir, mockInputsDir, mockStyleControlsDir],
        mockCatalogPath,
        tempTestDir
      );
      expect(firstPass.changed).toBe(false);

      const catalogAfter = fs.readFileSync(mockCatalogPath, 'utf8');
      expect(catalogAfter).toBe(initialCatalog);
    });
  });

  describe('syncTelemetryCompliance()', () => {
    it('synchronizes telemetry keys from types.ts into COMPLIANCE.md', () => {
      const mockTypesContent = `
export const ALLOWED_TELEMETRY_KEYS = [
  'engine',
  'styleId',
  'errorType',
  'customMetric'
] as const;
`;
      fs.writeFileSync(mockTypesPath, mockTypesContent);

      const mockComplianceContent = `---
publish-approved: true
---

# Compliance

- **Opt-In Telemetry:**
  - If you encounter a scannability issue, parameters are: \`engine\`, \`styleId\`.
  - **Telemetry Schema Contract (source of truth):**
    - Diagnostic telemetry is strictly allowlisted in \`src/types.ts\` via ALLOWED_TELEMETRY_KEYS.
    - Accepted keys are: \`engine\`, \`styleId\`.
- **What is NOT Logged:**
`;
      fs.writeFileSync(mockCompliancePath, mockComplianceContent);

      const result = syncTelemetryCompliance(mockTypesPath, mockCompliancePath);
      expect(result.changed).toBe(true);

      const updatedCompliance = fs.readFileSync(mockCompliancePath, 'utf8');
      expect(updatedCompliance).toContain('`engine`, `styleId`, `errorType`, `customMetric`');

      // Second pass should be idempotent
      const secondPass = syncTelemetryCompliance(mockTypesPath, mockCompliancePath);
      expect(secondPass.changed).toBe(false);
    });
  });

  describe('syncAll()', () => {
    it('runs catalog sync and telemetry compliance sync in one invocation', () => {
      fs.writeFileSync(path.join(mockUiDir, 'Box.tsx'), 'export const Box = () => <div />;');
      fs.writeFileSync(mockCatalogPath, `---
publish-approved: true
---

# UI Catalog

## 1. Core Shared UI Elements (\`src/components/ui/\`)

## 2. QR Input Form Panel Components (\`src/components/inputs/\`)

## 3. Styling & Customization Controls (\`src/components/style-controls/\`)

## 4. Shared Utilities & Renderers (\`src/utils/colorUtils.ts\`)
`);

      const result = syncAll({
        uiDirs: [mockUiDir, mockInputsDir, mockStyleControlsDir],
        catalogPath: mockCatalogPath,
        root: tempTestDir,
        typesPath: mockTypesPath,
        compliancePath: mockCompliancePath,
        skipManifest: true,
      });

      expect(result.changed).toBe(true);
      const catalog = fs.readFileSync(mockCatalogPath, 'utf8');
      expect(catalog).toContain('**Box** (`Box.tsx`)');
    });
  });

  describe('validate_ui_catalog.js --fix integration', () => {
    it('delegates to syncUICatalog to repair missing components and pass validation', () => {
      // 1. Create a component in mockUiDir
      fs.writeFileSync(path.join(mockUiDir, 'FixMeComp.tsx'), 'export const FixMeComp = () => <div />;');
      fs.writeFileSync(path.join(mockUiDir, 'FixMeComp.test.tsx'), '// test');

      // 2. Initial catalog lacks FixMeComp -> validateCatalog fails
      const initialCatalog = `---
publish-approved: true
---

# UI Catalog

## 1. Core Shared UI Elements (\`src/components/ui/\`)

## 2. QR Input Form Panel Components (\`src/components/inputs/\`)

## 3. Styling & Customization Controls (\`src/components/style-controls/\`)

## 4. Shared Utilities & Renderers (\`src/utils/colorUtils.ts\`)
`;
      fs.writeFileSync(mockCatalogPath, initialCatalog);

      const preErrors = validateCatalog(
        [mockUiDir, mockInputsDir, mockStyleControlsDir],
        mockCatalogPath
      );
      expect(preErrors.length).toBeGreaterThan(0);
      expect(preErrors).toContain("UI component 'FixMeComp.tsx' is missing from the catalog (UI_CATALOG.md).");

      // 3. Auto-fix delegation via syncUICatalog
      const syncResult = syncUICatalog(
        [mockUiDir, mockInputsDir, mockStyleControlsDir],
        mockCatalogPath,
        tempTestDir
      );
      expect(syncResult.changed).toBe(true);

      // 4. Verification passes cleanly post-fix
      const postErrors = validateCatalog(
        [mockUiDir, mockInputsDir, mockStyleControlsDir],
        mockCatalogPath
      );
      expect(postErrors).toHaveLength(0);

      const catalogContent = fs.readFileSync(mockCatalogPath, 'utf8');
      expect(catalogContent).toContain('**FixMeComp** (`FixMeComp.tsx` / `FixMeComp.test.tsx`)');
    });

    it('filters out --fix flag in parseArgs so it is not treated as a target file', async () => {
      const { parseArgs } = await import('../scripts/validate_ui_catalog.js');
      const parsed = parseArgs(['--fix', 'src/components/ui/Button.tsx', '--verbose']);
      expect(parsed).toEqual(['src/components/ui/Button.tsx']);
    });
  });
});
