#!/usr/bin/env bash
set -euo pipefail
# DEPRECATED: Release version determination is now performed by scripts/release_engine.js.
# This script is retained for the rollback pipeline (deploy.yml is_rollback=true) only.
# For standard releases, use `pnpm run release:dry-run` or `pnpm run release:changelog`.

ROLLBACK="${ROLLBACK:-false}"
GITHUB_SHA="${GITHUB_SHA:-}"
GITHUB_ENV="${GITHUB_ENV:-/dev/null}"

VERSION=$(node -p "require('./package.json').version")
if [ "$ROLLBACK" = "true" ]; then
  VERSION="${VERSION}-rollback-${GITHUB_SHA}"
fi
echo "VERSION=$VERSION" >> "$GITHUB_ENV"
