#!/usr/bin/env bash
set -euo pipefail

IS_ROLLBACK="${IS_ROLLBACK:-false}"
GITHUB_ENV="${GITHUB_ENV:-/dev/null}"

if [ "$IS_ROLLBACK" = "true" ]; then
  echo "ROLLBACK=true" >> "$GITHUB_ENV"
else
  echo "ROLLBACK=false" >> "$GITHUB_ENV"
fi
