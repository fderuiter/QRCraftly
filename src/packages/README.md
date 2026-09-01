# Deep modules

Use this copy-me layout for packages:

```text
src/packages/<name>/
  index.ts       # entry point (public interface)
  client.ts      # optional additional entry point
  lib/           # private implementation
  tests/         # co-located tests and fixtures
```

**Entry-point seam.** Import a package only through its entry points: the files at the package root. Every file in a subfolder is private implementation. Avoid barrel files that re-export an entire subtree; expose several small root entry points instead.

**Intra-package freedom.** Files in a package's implementation may import one another freely. This keeps complexity local while the package presents a small interface to its callers.

**Tests through entry points.** Tests import the package under test through root entry points, just like production callers. A package's tests may share fixtures from their own `tests/` folder, but may not deep-import any package implementation.

**No cycles.** Package dependencies must remain acyclic. Layering rules—which packages may depend on which—are a separate concern and can be added when those seams are established.

Run `pnpm run lint:boundaries` to check these rules. The `example/` package is a starter template to copy or delete.
