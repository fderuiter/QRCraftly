import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

interface RuleSide {
  path?: string;
  pathNot?: string;
  dependencyTypesNot?: string[];
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

/** Substitutes the package name captured by `from.path` into `to.pathNot`, as dependency-cruiser does. */
function resolveOwnPackage(r: Rule, from: string): Rule {
  const ownPackage = /^src\/packages\/([^/]+)\//.exec(from)?.[1] ?? '';
  return { ...r, to: { ...r.to, pathNot: r.to.pathNot?.replace('$1', ownPackage) } };
}

const appLayerRule = rule('packages-must-not-import-app-layers');
const forbiddenByAppLayerRules = (from: string, to: string) => forbids(appLayerRule, from, to);

describe('dependency-cruiser package boundary rules', () => {
  it('enforces the app-layer rule as an error with no known-violation exemptions', () => {
    expect(appLayerRule.severity).toBe('error');
    expect(appLayerRule.from.pathNot).toBeUndefined();
    expect(config.forbidden.some((r) => r.name.includes('known-violations'))).toBe(false);
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

  it('forbids optical-transfer from importing the app layers it used to reach into (#980)', () => {
    for (const target of ['src/hooks/useCamera.ts', 'src/context/QRContext.tsx', 'src/components/QRTool.tsx']) {
      expect(forbiddenByAppLayerRules('src/packages/optical-transfer/client.ts', target)).toBe(true);
      expect(forbiddenByAppLayerRules('src/packages/optical-transfer/lib/receiver/useOpticalReceiver.ts', target)).toBe(true);
    }
  });

  describe('cross-package-imports-use-alias', () => {
    const aliasRule = rule('cross-package-imports-use-alias');
    const from = 'src/packages/optical-transfer/lib/handshake.ts';
    const resolved = resolveOwnPackage(aliasRule, from);
    /** Mirrors dependency-cruiser's dependencyTypesNot check on the `to` side. */
    const forbidsImport = (to: string, dependencyTypes: string[]) =>
      forbids(resolved, from, to) &&
      !(aliasRule.to.dependencyTypesNot ?? []).some((type) => dependencyTypes.includes(type));

    it('is an error', () => {
      expect(aliasRule.severity).toBe('error');
    });

    it('forbids a relative import into another package, even of its entry point', () => {
      expect(forbidsImport('src/packages/qr-matrix/index.ts', ['local', 'import'])).toBe(true);
      expect(forbidsImport('src/packages/scannability/worker.ts', ['local', 'import'])).toBe(true);
    });

    it('allows the @/packages alias to another package', () => {
      expect(forbidsImport('src/packages/qr-matrix/index.ts', ['aliased', 'aliased-tsconfig', 'local', 'import'])).toBe(false);
    });

    it("allows relative imports inside the package's own files", () => {
      expect(forbidsImport('src/packages/optical-transfer/lib/framePool.ts', ['local', 'import'])).toBe(false);
    });

    it('does not constrain app code outside the packages', () => {
      expect(forbids(aliasRule, 'src/pages/file-transfer/+Page.tsx', 'src/packages/optical-transfer/client.ts')).toBe(false);
    });
  });

  it("forbids a package from deep-importing another package's lib/", () => {
    const from = 'src/packages/arcade/lib/scanPipeline.ts';
    const resolved = resolveOwnPackage(rule('entrypoint-boundary-across-packages'), from);
    expect(forbids(resolved, from, 'src/packages/scannability/lib/checker.ts')).toBe(true);
    expect(forbids(resolved, from, 'src/packages/scannability/index.ts')).toBe(false);
    expect(forbids(resolved, from, 'src/packages/arcade/lib/matrix.ts')).toBe(false);
  });
});
