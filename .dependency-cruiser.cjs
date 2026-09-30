// @ts-check
// Deep-module enforcement for dependency-cruiser.
//
// Each package under the packages root is a DEEP MODULE: a lot of behaviour
// behind a small interface. A package's PUBLIC SURFACE is its ENTRY POINTS:
// the files at the package root. Implementation lives in SUBFOLDERS and is
// private (by convention `lib/` for implementation and `tests/` for tests,
// though any subfolder is private). A package may expose several small entry
// points (index.ts, client.ts, server.ts, …); prefer that over one giant
// barrel index.
//
// Beyond PACKAGES_ROOT, the app-layer rule's known-violations list below must
// only ever shrink (see GitHub issue #980).

/** Where packages live. One immediate child dir per package (flat, no nesting). */
const PACKAGES_ROOT = "src/packages";

// --- derived patterns (no need to edit) -------------------------------------
const R = PACKAGES_ROOT;
/**
 * A package's private internals: anything nested inside a package subfolder.
 * The package's root files are its entry points and are NOT matched here:
 * they stay importable from outside.
 */
const PACKAGE_INTERNALS = `^${R}/[^/]+/[^/]+/`;

/** App layers that packages must never import (see packages-must-not-import-app-layers). */
const APP_LAYERS = "^src/(context|hooks|components|pages)/|^src/registry\\.tsx?$";

/**
 * Files with pre-existing app-layer imports, tracked by GitHub issue #980. Keep this list short
 * and exact; it exists so the rule can be an error today without blessing new violations.
 */
const KNOWN_APP_LAYER_VIOLATORS = `^${R}/optical-transfer/client\\.ts$`;

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "entrypoint-boundary-from-app",
      comment:
        "App/root code may import a package's entry points (its root files), but nothing inside its subfolders.",
      severity: "error",
      from: { pathNot: `^${R}/` },
      to: { path: PACKAGE_INTERNALS },
    },
    {
      name: "entrypoint-boundary-across-packages",
      comment:
        "A package's own files import each other freely, but may reach OTHER packages only through their entry points, never their internals.",
      severity: "error",
      from: { path: `^${R}/([^/]+)/`, pathNot: `^${R}/[^/]+/tests/` },
      to: {
        path: PACKAGE_INTERNALS,
        pathNot: `^${R}/$1/`,
      },
    },
    {
      name: "tests-through-entrypoints",
      comment:
        "A package's tests exercise it through its entry points like everyone else: they may import any package's entry points and their own tests/ fixtures, but never any package's internals, not even their own.",
      severity: "error",
      from: { path: `^${R}/([^/]+)/tests/` },
      to: {
        path: PACKAGE_INTERNALS,
        pathNot: `^${R}/$1/tests/`,
      },
    },
    {
      name: "tests-folder-is-private",
      comment:
        "A package's tests/ folder is reachable only from tests: nothing else may import fixtures.",
      severity: "error",
      from: { pathNot: `^${R}/[^/]+/tests/` },
      to: { path: `^${R}/[^/]+/tests/` },
    },
    {
      name: "no-circular",
      comment: "No dependency cycles. Scope to `^${R}/` if you want to allow cycles outside packages.",
      severity: "error",
      from: {},
      to: { circular: true },
    },

    {
      name: "packages-must-not-import-app-layers",
      comment:
        "Packages are app-independent deep modules: they never import the app's React layers (context, hooks, components, pages, registry). Inject stores, capabilities and callbacks from the call site instead.",
      severity: "error",
      from: { path: `^${R}/`, pathNot: KNOWN_APP_LAYER_VIOLATORS },
      to: { path: APP_LAYERS },
    },
    {
      name: "packages-must-not-import-app-layers-known-violations",
      comment:
        "KNOWN VIOLATIONS (follow-up: GitHub issue #980). optical-transfer/client.ts still imports these three app-layer modules. Only these exact edges are tolerated; any other app-layer import from that file is an error. Remove this rule once #980 moves the wiring to the call site.",
      severity: "error",
      from: { path: KNOWN_APP_LAYER_VIOLATORS },
      to: {
        path: APP_LAYERS,
        pathNot: "^src/(hooks/useCamera|hooks/useAdaptiveScanner|context/QRContext)\\.tsx?$",
      },
    },

    // Layering controls WHICH packages may depend on which; add repo-specific
    // rules here when that concern has a concrete seam.
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
    },
  },
};
