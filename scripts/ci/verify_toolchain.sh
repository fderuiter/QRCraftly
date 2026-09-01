#!/usr/bin/env bash
set -euo pipefail

# Verify pnpm version matches package.json's packageManager field
PNPM_VERSION=$(pnpm --version)
EXPECTED_PNPM="11.1.3"
echo "Current pnpm version: $PNPM_VERSION"
if [ "$PNPM_VERSION" != "$EXPECTED_PNPM" ]; then
  echo "Error: pnpm version $PNPM_VERSION does not match pinned version $EXPECTED_PNPM"
  exit 1
fi

# Verify Node.js version matches pinned setup configuration
NODE_VERSION=$(node --version)
EXPECTED_NODE="v22.14.0"
echo "Current Node.js version: $NODE_VERSION"
if [[ "$NODE_VERSION" != "$EXPECTED_NODE"* ]]; then
  echo "Error: Node.js version $NODE_VERSION does not match pinned version $EXPECTED_NODE"
  exit 1
fi
