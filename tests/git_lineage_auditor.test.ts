import { describe, it, expect } from 'vitest';
import { checkLineage, parseGitStatus, MAPPING, parseArgs } from '../scripts/git_lineage_auditor.js';

describe('Local Git-Diff Lineage Auditor', () => {
  it('should maintain the correct core mappings', () => {
    expect(MAPPING).toHaveProperty('src/utils/sharedContract.ts', 'docs/public/SCALING.md');
    expect(MAPPING).toHaveProperty('src/components/InputPanel.tsx', 'src/components/inputs/README.md');
  });

  it('should parse git status --porcelain correctly', () => {
    const mockStdout = ` M src/utils/sharedContract.ts\n?? some/new/file.ts\n R old_file.ts -> src/components/InputPanel.tsx`;
    const parsed = parseGitStatus(mockStdout);
    
    expect(parsed.has('src/utils/sharedContract.ts')).toBe(true);
    expect(parsed.has('some/new/file.ts')).toBe(true);
    expect(parsed.has('src/components/InputPanel.tsx')).toBe(true);
    expect(parsed.has('old_file.ts')).toBe(false);
  });

  it('should parse git status --porcelain correctly with octal escape sequences, quotes, and spaces', () => {
    // 1. Octal escapes decoding (like \303\251 -> é)
    const mockStdoutOctal = ` M "src/utils/sh\\303\\251.ts"`;
    const parsedOctal = parseGitStatus(mockStdoutOctal);
    expect(parsedOctal.has('src/utils/shé.ts')).toBe(true);

    // 2. Spaces wrapped in quotes
    const mockStdoutSpaces = `?? "src/components/my file.tsx"`;
    const parsedSpaces = parseGitStatus(mockStdoutSpaces);
    expect(parsedSpaces.has('src/components/my file.tsx')).toBe(true);

    // 3. Renamed file with quotes and non-ASCII character and spaces
    const mockStdoutRename = ` R  "old file.ts" -> "src/components/my file \\303\\251.tsx"`;
    const parsedRename = parseGitStatus(mockStdoutRename);
    expect(parsedRename.has('src/components/my file é.tsx')).toBe(true);

    // 4. Invalid/out-of-range octal sequence should be bypassed gracefully without crashing
    const mockStdoutInvalidOctal = ` M "src/utils/invalid_\\777_seq.ts"`;
    const parsedInvalidOctal = parseGitStatus(mockStdoutInvalidOctal);
    expect(parsedInvalidOctal.has('src/utils/invalid_/777_seq.ts')).toBe(true);
  });

  it('should fail validation when a mapped contract is modified without its paired doc', () => {
    const modifiedFiles = new Set(['src/utils/sharedContract.ts', 'src/types.ts']);
    const missing = checkLineage(modifiedFiles);
    
    expect(missing).toHaveLength(1);
    expect(missing[0]).toEqual({
      codeFile: 'src/utils/sharedContract.ts',
      docFile: 'docs/public/SCALING.md'
    });
  });

  it('should pass validation when a mapped contract is modified with its paired doc', () => {
    const modifiedFiles = new Set(['src/utils/sharedContract.ts', 'docs/public/SCALING.md']);
    const missing = checkLineage(modifiedFiles);
    
    expect(missing).toHaveLength(0);
  });

  it('should pass validation when no mapped contracts are modified', () => {
    const modifiedFiles = new Set(['src/types.ts', 'src/components/inputs/TextInput.tsx']);
    const missing = checkLineage(modifiedFiles);
    
    expect(missing).toHaveLength(0);
  });

  describe('Multi-target validation specifications', () => {
    it('should maintain the correct multi-target mappings', () => {
      expect(MAPPING).toHaveProperty('src/types.ts');
      expect(MAPPING['src/types.ts']).toEqual([
        'docs/public/SECURITY.md',
        'docs/public/COMPLIANCE.md',
        'src/components/inputs/README.md'
      ]);

      expect(MAPPING).toHaveProperty('semgrep.yml');
      expect(MAPPING['semgrep.yml']).toEqual([
        'docs/public/SECURITY.md',
        'docs/public/COMPLIANCE.md'
      ]);

      expect(MAPPING).toHaveProperty('src/colors.json');
      expect(MAPPING['src/colors.json']).toEqual([
        'docs/public/STYLE_GUIDE.md',
        'docs/public/SECURITY.md',
        'docs/public/COMPLIANCE.md'
      ]);
    });

    it('should fail multi-target validation when some/all targets are missing for a core schema', () => {
      const modifiedFiles = new Set([
        'src/types.ts',
        'docs/public/SECURITY.md'
      ]);
      const missing = checkLineage(modifiedFiles);
      
      expect(missing).toContainEqual({
        codeFile: 'src/types.ts',
        docFile: 'docs/public/COMPLIANCE.md'
      });
      expect(missing).toContainEqual({
        codeFile: 'src/types.ts',
        docFile: 'src/components/inputs/README.md'
      });
      expect(missing).not.toContainEqual({
        codeFile: 'src/types.ts',
        docFile: 'docs/public/SECURITY.md'
      });
    });

    it('should pass multi-target validation when all targets are present for core schemas', () => {
      const modifiedFiles = new Set([
        'src/types.ts',
        'docs/public/SECURITY.md',
        'docs/public/COMPLIANCE.md',
        'src/components/inputs/README.md'
      ]);
      const missing = checkLineage(modifiedFiles);
      expect(missing).toHaveLength(0);
    });

    it('should fail multi-target validation when editing central color configurations without updating style guide', () => {
      const modifiedFiles = new Set([
        'src/colors.json',
        'docs/public/SECURITY.md',
        'docs/public/COMPLIANCE.md'
      ]);
      const missing = checkLineage(modifiedFiles);
      
      expect(missing).toContainEqual({
        codeFile: 'src/colors.json',
        docFile: 'docs/public/STYLE_GUIDE.md'
      });
    });

    it('should pass multi-target validation when editing colors along with all of its mapped documentation targets', () => {
      const modifiedFiles = new Set([
        'src/colors.json',
        'docs/public/STYLE_GUIDE.md',
        'docs/public/SECURITY.md',
        'docs/public/COMPLIANCE.md'
      ]);
      const missing = checkLineage(modifiedFiles);
      expect(missing).toHaveLength(0);
    });
  });

  describe('Command-Line Arguments Parsing', () => {
    it('should extract positional file arguments and ignore flags', () => {
      const args = ['--verbose', 'src/types.ts', '--config', 'docs/public/SECURITY.md'];
      const parsed = parseArgs(args);
      expect(parsed).toEqual(['src/types.ts', 'docs/public/SECURITY.md']);
    });

    it('should normalize backslashes to forward slashes', () => {
      const args = ['src\\utils\\sharedContract.ts', 'docs\\public\\SCALING.md'];
      const parsed = parseArgs(args);
      expect(parsed).toEqual(['src/utils/sharedContract.ts', 'docs/public/SCALING.md']);
    });

    it('should handle space-separated or comma-separated files inside a single argument', () => {
      const args = ['src/types.ts,docs/public/SECURITY.md', 'src/colors.json  docs/public/STYLE_GUIDE.md'];
      const parsed = parseArgs(args);
      expect(parsed).toEqual([
        'src/types.ts',
        'docs/public/SECURITY.md',
        'src/colors.json',
        'docs/public/STYLE_GUIDE.md'
      ]);
    });

    it('should filter out empty or whitespace-only arguments', () => {
      const args = ['', '   ', 'src/types.ts', ''];
      const parsed = parseArgs(args);
      expect(parsed).toEqual(['src/types.ts']);
    });
  });
});
