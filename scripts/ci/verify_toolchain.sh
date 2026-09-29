#!/usr/bin/env bash
set -euo pipefail

# Pinned versions come from the repository itself so the gate cannot drift:
# pnpm from package.json's packageManager field, Node.js from .nvmrc.
EXPECTED_PNPM=$(node -p "require('./package.json').packageManager.split('@')[1]")
EXPECTED_NODE="v$(tr -d '[:space:]' < .nvmrc)"

PNPM_VERSION=$(pnpm --version)
echo "Current pnpm version: $PNPM_VERSION"
if [ "$PNPM_VERSION" != "$EXPECTED_PNPM" ]; then
  echo "Error: pnpm version $PNPM_VERSION does not match pinned version $EXPECTED_PNPM"
  exit 1
fi

NODE_VERSION=$(node --version)
echo "Current Node.js version: $NODE_VERSION"
if [ "$NODE_VERSION" != "$EXPECTED_NODE" ]; then
  echo "Error: Node.js version $NODE_VERSION does not match pinned version $EXPECTED_NODE (.nvmrc)"
  exit 1
fi
