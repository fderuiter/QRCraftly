#!/usr/bin/env bash
set -euo pipefail

pnpm exec playwright install --with-deps chromium
pnpm exec playwright test e2e/smoke.spec.ts --project=chromium
