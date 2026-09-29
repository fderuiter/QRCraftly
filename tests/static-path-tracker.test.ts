import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { scanFileForPaths, callsSanitizeSvg } from '../scripts/static-path-tracker.js';

describe('static-path-tracker', () => {
  describe('scanFileForPaths', () => {
    const tempFileWithViolation = path.resolve('src/utils/temp-test-violation.ts');
    const tempFileClean = path.resolve('src/utils/temp-test-clean.ts');

    beforeAll(() => {
      // Create a file simulating an unvalidated SVG data flow (Source-to-Sink without sanitizeSvg)
      fs.writeFileSync(
        tempFileWithViolation,
        `
        // Unvalidated SVG path violation
        export function handleLogoUpload(file: File, onSuccess: (url: string) => void) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = e.target?.result as string;
            onSuccess(result);
          };
          reader.readAsDataURL(file);
        }
        `,
        'utf8'
      );

      // Create a file simulating a validated/clean SVG data flow
      fs.writeFileSync(
        tempFileClean,
        `
        import { sanitizeSvg } from './security';

        export function handleLogoUploadClean(file: File, onSuccess: (url: string) => void) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = e.target?.result as string;
            const sanitized = sanitizeSvg(result);
            onSuccess(sanitized);
          };
          reader.readAsText(file);
        }
        `,
        'utf8'
      );
    });

    afterAll(() => {
      if (fs.existsSync(tempFileWithViolation)) fs.unlinkSync(tempFileWithViolation);
      if (fs.existsSync(tempFileClean)) fs.unlinkSync(tempFileClean);
    });

    it('should detect unvalidated source-to-sink paths in vulnerable files', () => {
      const findings = scanFileForPaths(tempFileWithViolation);
      expect(findings.length).toBe(1);
      expect(findings[0].type).toBe('Unvalidated SVG Source-to-Sink Path');
    });

    it('should ignore clean files where sanitization is present', () => {
      const findings = scanFileForPaths(tempFileClean);
      expect(findings.length).toBe(0);
    });
  });

  describe('sanitization must be real code', () => {
    const flow = (extra: string) => `
      ${extra}
      export function handleLogo(file: File, onSuccess: (url: string) => void) {
        const reader = new FileReader();
        reader.onload = (e) => onSuccess(String(e.target?.result));
        reader.readAsText(file);
      }
    `;
    const scanSource = (source: string) => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'path-tracker-'));
      const file = path.join(dir, 'upload.ts');
      try {
        fs.writeFileSync(file, source, 'utf8');
        return scanFileForPaths(file);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    };

    it('does not accept sanitizeSvg mentioned only in a comment', () => {
      expect(scanSource(flow('// sanitizeSvg is applied elsewhere'))).toHaveLength(1);
    });

    it('does not accept sanitizeSvg mentioned only in a string or an unused import', () => {
      expect(scanSource(flow("import { sanitizeSvg } from './security';\nconst note = 'sanitizeSvg';"))).toHaveLength(1);
    });

    it('accepts a direct call, a namespaced call, or passing it as a callback', () => {
      expect(callsSanitizeSvg('const x = sanitizeSvg(raw);', 'a.ts')).toBe(true);
      expect(callsSanitizeSvg('const x = security.sanitizeSvg(raw);', 'a.ts')).toBe(true);
      expect(callsSanitizeSvg('p.then(sanitizeSvg);', 'a.ts')).toBe(true);
      expect(callsSanitizeSvg('const el = <div>{sanitizeSvg(raw)}</div>;', 'a.tsx')).toBe(true);
      expect(callsSanitizeSvg('// sanitizeSvg(raw)\nconst y = "sanitizeSvg(raw)";', 'a.ts')).toBe(false);
    });
  });
});
