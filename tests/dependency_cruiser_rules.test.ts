import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

interface RuleSide {
  path?: string;
  pathNot?: string;
}

interface Rule {
  name: string;
  comment?: string;
  severity: string;
  from: RuleSide;
  to: RuleSide;
}

const require = createRequire(import.meta.url);
const config: { forbidden: Rule[] } = require('../.dependency-cruiser.cjs');

function rule(name: string): Rule {
  const found = config.forbidden.find((r) => r.name === name);
  if (!found) throw new Error(`Missing dependency-cruiser rule ${name}`);
  return found;
}

/** Mirrors dependency-cruiser's path / pathNot matching for one side of a rule. */
function matches(side: RuleSide, file: string): boolean {
  if (side.path !== undefined && !new RegExp(side.path).test(file)) return false;
  if (side.pathNot !== undefined && new RegExp(side.pathNot).test(file)) return false;
  return true;
}

function forbids(r: Rule, from: string, to: string): boolean {
  return matches(r.from, from) && matches(r.to, to);
}

const appLayerRule = rule('packages-must-not-import-app-layers');
const knownViolations = rule('packages-must-not-import-app-layers-known-violations');
const forbiddenByAppLayerRules = (from: string, to: string) =>
  forbids(appLayerRule, from, to) || forbids(knownViolations, from, to);

describe('dependency-cruiser package boundary rules', () => {
  it('enforces the app-layer rules as errors', () => {
    expect(appLayerRule.severity).toBe('error');
    expect(knownViolations.severity).toBe('error');
  });

  it.each([
    'src/context/QRContext.tsx',
    'src/hooks/useCapabilities.ts',
    'src/components/QRTool.tsx',
    'src/pages/index/+Page.tsx',
    'src/registry.tsx',
  ])('forbids packages from importing the app layer %s', (target) => {
    expect(forbiddenByAppLayerRules('src/packages/scannability/lib/evaluator.ts', target)).toBe(true);
    expect(forbiddenByAppLayerRules('src/packages/scannability/client.ts', target)).toBe(true);
  });

  it('still lets packages import shared utilities, types and other packages', () => {
    const from = 'src/packages/scannability/lib/checker.ts';
    expect(forbiddenByAppLayerRules(from, 'src/utils/security.ts')).toBe(false);
    expect(forbiddenByAppLayerRules(from, 'src/types.ts')).toBe(false);
    expect(forbiddenByAppLayerRules(from, 'src/packages/qr-payload/index.ts')).toBe(false);
  });

  it('does not constrain app code importing app layers', () => {
    expect(forbiddenByAppLayerRules('src/hooks/useScannability.ts', 'src/context/QRContext.tsx')).toBe(false);
  });

  it('tolerates only the exact known violations tracked by #980', () => {
    const violator = 'src/packages/optical-transfer/client.ts';
    expect(knownViolations.comment).toContain('#980');
    for (const tolerated of ['src/hooks/useCamera.ts', 'src/hooks/useAdaptiveScanner.ts', 'src/context/QRContext.tsx']) {
      expect(forbiddenByAppLayerRules(violator, tolerated)).toBe(false);
    }
    expect(forbiddenByAppLayerRules(violator, 'src/components/QRTool.tsx')).toBe(true);
    expect(forbiddenByAppLayerRules(violator, 'src/hooks/useCapabilities.ts')).toBe(true);
    // Other optical-transfer files get no exemption.
    expect(forbiddenByAppLayerRules('src/packages/optical-transfer/lib/handshake.ts', 'src/hooks/useCamera.ts')).toBe(true);
  });

  it("forbids a package from deep-importing another package's lib/", () => {
    const acrossPackages = rule('entrypoint-boundary-across-packages');
    const from = 'src/packages/arcade/lib/scanPipeline.ts';
    // dependency-cruiser substitutes the captured package name ($1) from `from.path`.
    const ownPackage = /^src\/packages\/([^/]+)\//.exec(from)?.[1] ?? '';
    const resolved: Rule = {
      ...acrossPackages,
      to: { ...acrossPackages.to, pathNot: acrossPackages.to.pathNot?.replace('$1', ownPackage) },
    };
    expect(forbids(resolved, from, 'src/packages/scannability/lib/checker.ts')).toBe(true);
    expect(forbids(resolved, from, 'src/packages/scannability/index.ts')).toBe(false);
    expect(forbids(resolved, from, 'src/packages/arcade/lib/matrix.ts')).toBe(false);
  });
});
