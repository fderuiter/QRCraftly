#!/usr/bin/env bash
set -euo pipefail

ROLLBACK="${ROLLBACK:-false}"
GITHUB_SHA="${GITHUB_SHA:-}"
GITHUB_ENV="${GITHUB_ENV:-/dev/null}"

VERSION=$(node -p "require('./package.json').version")
if [ "$ROLLBACK" = "true" ]; then
  VERSION="${VERSION}-rollback-${GITHUB_SHA}"
fi
echo "VERSION=$VERSION" >> "$GITHUB_ENV"
