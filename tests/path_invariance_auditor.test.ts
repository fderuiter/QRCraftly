import { describe, it, expect } from 'vitest';
import { scanContentForPathInvariants, scanFileForPathInvariants } from '../scripts/path_invariance_auditor.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.join(__dirname, '..');

describe('Path Invariance Auditor', () => {
  describe('scanContentForPathInvariants', () => {
    it('should detect hardcoded Windows drive paths', () => {
      const code = `const filePath = "C:\\\\Users\\\\John\\\\file.txt";`;
      const findings = scanContentForPathInvariants(code, 'src/example.ts');
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].type).toBe('Hardcoded Absolute Host Path');
    });

    it('should detect hardcoded Unix home paths', () => {
      const code = `const target = '/home/ubuntu/app/data.json';`;
      const findings = scanContentForPathInvariants(code, 'src/example.ts');
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].type).toBe('Hardcoded Absolute Host Path');
    });

    it('should detect macOS user directory paths', () => {
      const code = `const macPath = '/Users/developer/code/proj';`;
      const findings = scanContentForPathInvariants(code, 'src/example.ts');
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].type).toBe('Hardcoded Absolute Host Path');
    });

    it('should detect unhandled newline split in scripts', () => {
      const code = `const lines = rawText.split('\\n');`;
      const findings = scanContentForPathInvariants(code, 'scripts/sample.js');
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].type).toBe('Unhandled CRLF Line Splitting');
    });

    it('should pass defensive newline split in scripts', () => {
      const code = `const lines = rawText.split(/\\r?\\n/);`;
      const findings = scanContentForPathInvariants(code, 'scripts/sample.js');
      expect(findings.length).toBe(0);
    });

    it('should detect unauthorized platform branching outside execHelper', () => {
      const code = `const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';`;
      const findings = scanContentForPathInvariants(code, 'scripts/my-script.js');
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].type).toBe('Ad-Hoc Platform Branching');
    });

    it('should allow platform branching inside execHelper utilities', () => {
      const code = `if (process.platform === 'win32') return command + '.cmd';`;
      const findings = scanContentForPathInvariants(code, 'scripts/utils/execHelper.js');
      expect(findings.length).toBe(0);
    });

    it('should ignore mock strings in test files like C:\\fakepath', () => {
      const code = `const input = { value: 'C:\\\\fakepath\\\\sample.txt' };`;
      const findings = scanContentForPathInvariants(code, 'src/hooks/useAnimatedQrSender.test.ts');
      expect(findings.length).toBe(0);
    });
  });

  describe('scanFileForPathInvariants on real repo files', () => {
    it('should pass cleanly on scripts/utils/execHelper.js', () => {
      const filePath = path.join(repoRoot, 'scripts', 'utils', 'execHelper.js');
      const findings = scanFileForPathInvariants(filePath);
      expect(findings).toEqual([]);
    });

    it('should pass cleanly on tests/utils/execHelper.ts', () => {
      const filePath = path.join(repoRoot, 'tests', 'utils', 'execHelper.ts');
      const findings = scanFileForPathInvariants(filePath);
      expect(findings).toEqual([]);
    });
  });
});

