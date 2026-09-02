import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Tiered Ownership and Selective Duplication Audits configuration tests', () => {
  it('should verify CODEOWNERS rules restrict approvals to shared components/utilities and keep sandbox open', () => {
    const codeownersPath = path.resolve(__dirname, '../.github/CODEOWNERS');
    expect(fs.existsSync(codeownersPath)).toBe(true);

    const content = fs.readFileSync(codeownersPath, 'utf8');
    const lines = content.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'));

    // Check that there is a rule for /src/pages/dev-sandbox/ that is open (no owner assigned)
    const sandboxRuleIndex = lines.findIndex(line => line.startsWith('/src/pages/dev-sandbox/'));
    expect(sandboxRuleIndex).not.toBe(-1);

    const sandboxRule = lines[sandboxRuleIndex];
    const sandboxParts = sandboxRule.split(/\s+/);
    // There shouldn't be any owner name after the path
    expect(sandboxParts).toHaveLength(1);
    expect(sandboxParts[0]).toBe('/src/pages/dev-sandbox/');

    // Check that core utility files are owned by @fderuiter
    const utilsRule = lines.find(line => line.startsWith('/src/utils/'));
    expect(utilsRule).toBeDefined();
    expect(utilsRule).toContain('@fderuiter');

    // Check that shared components are owned by @fderuiter
    const componentsRule = lines.find(line => line.startsWith('/src/components/'));
    expect(componentsRule).toBeDefined();
    expect(componentsRule).toContain('@fderuiter');

    // Check that infrastructure paths are owned by @fderuiter
    const githubRule = lines.find(line => line.startsWith('/.github/'));
    expect(githubRule).toBeDefined();
    expect(githubRule).toContain('@fderuiter');

    // Check order: dev-sandbox rule should be defined after the more general pages/ rule
    const pagesRuleIndex = lines.findIndex(line => line.startsWith('/src/pages/'));
    expect(pagesRuleIndex).not.toBe(-1);
    expect(sandboxRuleIndex).toBeGreaterThan(pagesRuleIndex);
  });

  it('should verify selective duplication audits configured in .jscpd.json', () => {
    const jscpdPath = path.resolve(__dirname, '../.jscpd.json');
    expect(fs.existsSync(jscpdPath)).toBe(true);

    const config = JSON.parse(fs.readFileSync(jscpdPath, 'utf8'));
    
    // Check path scanned is "src"
    expect(config.path).toContain('src');

    // Check ignore contains sandbox path
    expect(config.ignore).toContain('src/pages/dev-sandbox/**/*');

    // Check that general "src/pages/**/*" is NOT ignored anymore to allow auditing production routed pages
    expect(config.ignore).not.toContain('src/pages/**/*');
  });
});
