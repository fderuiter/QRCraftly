#!/usr/bin/env bash
set -euo pipefail
# DEPRECATED: Manual version bumping via this script is superseded by scripts/release_engine.js.
# This script is retained solely for the emergency rollback pipeline (deploy.yml is_rollback=true).
# Use `pnpm run release:changelog` or `pnpm run release:promote` for standard releases.

VERSION_BUMP="${VERSION_BUMP:-}"

if [ -n "$VERSION_BUMP" ]; then
  git config --global user.name "github-actions[bot]"
  git config --global user.email "github-actions[bot]@users.noreply.github.com"
  pnpm version "$VERSION_BUMP" --no-git-tag-version
fi
