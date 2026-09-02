#!/usr/bin/env bash
set -euo pipefail

GITHUB_OUTPUT="${GITHUB_OUTPUT:-/dev/null}"

echo "Ensuring Cloudflare Pages project exists..."
pnpm exec wrangler pages project create qrcraftly --production-branch=main || true

echo "Deploying dev branch to Cloudflare Pages..."
pnpm exec wrangler pages deploy dist/client --project-name=qrcraftly --branch=dev --commit-dirty > deploy_output.txt 2>&1 || { cat deploy_output.txt && exit 1; }
cat deploy_output.txt

DEPLOYMENT_URL=$( (grep -oE "https://[a-zA-Z0-9.-]+\.pages\.dev" deploy_output.txt || true) | tail -n 1)
if [ -z "$DEPLOYMENT_URL" ]; then
  echo "ERROR: Failed to extract Cloudflare Pages deployment URL for dev branch." >&2
  exit 1
fi

echo "Extracted Dev Deployment URL: $DEPLOYMENT_URL"
echo "deployment-url=$DEPLOYMENT_URL" >> "$GITHUB_OUTPUT"

