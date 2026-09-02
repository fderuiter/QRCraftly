import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('GitHub Actions Workflow Hardening Audit', () => {
  const workflowsDir = path.resolve(process.cwd(), '.github/workflows');

  it('audits all workflow files to ensure no inline ${{ }} expansions exist inside run or script execution blocks', () => {
    const files = fs.readdirSync(workflowsDir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
    expect(files.length).toBeGreaterThan(0);

    const violations: string[] = [];

    for (const file of files) {
      const filePath = path.join(workflowsDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split(/\r?\n/);

      let inRunOrScriptBlock = false;
      let blockIndent = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const indentMatch = line.match(/^(\s*)/);
        const indent = indentMatch ? indentMatch[1].length : 0;

        // Check if starting run: or script: block
        if (/^\s*(run:|script:)/.test(line)) {
          if (!line.includes('|') && line.includes('${{')) {
            violations.push(`${file}:${i + 1}: ${line.trim()}`);
          } else if (line.includes('|')) {
            inRunOrScriptBlock = true;
            blockIndent = indent;
          }
          continue;
        }

        if (inRunOrScriptBlock) {
          // If indentation drops back to or lower than the key level and line is non-empty, block ended
          if (line.trim().length > 0 && indent <= blockIndent) {
            inRunOrScriptBlock = false;
          } else {
            if (line.includes('${{')) {
              violations.push(`${file}:${i + 1}: ${line.trim()}`);
            }
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
