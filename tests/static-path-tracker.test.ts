import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { scanFileForPaths } from '../scripts/static-path-tracker.js';

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
});
