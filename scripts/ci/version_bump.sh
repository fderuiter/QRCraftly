#!/usr/bin/env bash
set -euo pipefail

VERSION_BUMP="${VERSION_BUMP:-}"

if [ -n "$VERSION_BUMP" ]; then
  git config --global user.name "github-actions[bot]"
  git config --global user.email "github-actions[bot]@users.noreply.github.com"
  pnpm version "$VERSION_BUMP" --no-git-tag-version
fi
