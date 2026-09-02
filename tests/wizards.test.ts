import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execBinary, resolveBash } from './utils/execHelper';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.join(__dirname, '..');
const wizardsDir = path.join(repoRoot, 'scripts', 'wizards');

describe('Interactive DX Wizards', () => {
  it('should find all core wizards in scripts/wizards/', () => {
    expect(fs.existsSync(wizardsDir)).toBe(true);
    const wizards = fs.readdirSync(wizardsDir).filter(f => f.endsWith('.sh'));
    expect(wizards).toContain('setup-cloudflare.sh');
    expect(wizards).toContain('setup-github-ci.sh');
    expect(wizards).toContain('setup-local-dev.sh');
  });

  const wizardFiles = ['setup-cloudflare.sh', 'setup-github-ci.sh', 'setup-local-dev.sh'];

  wizardFiles.forEach(file => {
    describe(`Wizard: ${file}`, () => {
      const filePath = path.join(wizardsDir, file);

      it('should exist and be non-empty', () => {
        expect(fs.existsSync(filePath)).toBe(true);
        const content = fs.readFileSync(filePath, 'utf8');
        expect(content.length).toBeGreaterThan(100);
      });

      it('should have consistent wizard library structure', () => {
        const content = fs.readFileSync(filePath, 'utf8');
        expect(content).toContain('#!/usr/bin/env bash');
        expect(content).toContain('# STAGES: author this section.');
        expect(content).toContain('finish');

        const stagesSection = content.split('# STAGES:')[1] || '';
        const totalStagesMatch = stagesSection.match(/TOTAL_STAGES=(\d+)/);
        expect(totalStagesMatch).not.toBeNull();
        const totalStages = parseInt(totalStagesMatch![1], 10);
        expect(totalStages).toBeGreaterThan(0);

        const stageMatches = content.match(/^stage\s+"[^"]+"/gm);
        expect(stageMatches).not.toBeNull();
        expect(stageMatches!.length).toBe(totalStages);
      });

      it(
        'should pass bash static syntax check (bash -n)',
        () => {
          const bashBinary = resolveBash();
          const relativePath = `scripts/wizards/${file}`;
          const output = execBinary(bashBinary, ['-n', relativePath], { cwd: repoRoot });
          expect(output).toBeDefined();
        },
        30000
      );
    });
  });

  describe('Wizard Runner (scripts/run_wizard.js)', () => {
    const runnerPath = path.join(repoRoot, 'scripts', 'run_wizard.js').replace(/\\/g, '/');

    it('should display help and list available wizards when invoked with --help', () => {
      const output = execBinary('node', [runnerPath, '--help']);
      expect(output).toContain('QRCraftly DX Interactive Wizards');
      expect(output).toContain('setup-cloudflare');
      expect(output).toContain('setup-github-ci');
      expect(output).toContain('setup-local-dev');
    });

    it('should exit with code 1 and error message when wizard is not found', () => {
      expect(() => {
        execBinary('node', [runnerPath, 'non-existent-wizard']);
      }).toThrow();
    });
  });
});
