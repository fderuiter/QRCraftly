import { describe, it, expect } from 'vitest';
import { checkLineage, parseGitStatus, MAPPING } from '../scripts/git_lineage_auditor.js';

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
});
