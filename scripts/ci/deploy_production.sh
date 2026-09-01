#!/usr/bin/env bash
set -euo pipefail

GITHUB_OUTPUT="${GITHUB_OUTPUT:-/dev/null}"

echo "Deploying to Cloudflare Pages..."
pnpm exec wrangler pages deploy dist/client --project-name=qrcraftly --branch=main --commit-dirty > deploy_output.txt 2>&1 || { cat deploy_output.txt && exit 1; }
cat deploy_output.txt

DEPLOYMENT_URL=$( (grep -oE "https://[a-zA-Z0-9.-]+\.pages\.dev" deploy_output.txt || true) | tail -n 1)
if [ -z "$DEPLOYMENT_URL" ]; then
  DEPLOYMENT_URL=$( (grep -o "Take a look at: .*" deploy_output.txt || true) | sed "s/Take a look at: //" | xargs || true)
fi

echo "Extracted Deployment URL: $DEPLOYMENT_URL"
echo "deployment-url=$DEPLOYMENT_URL" >> "$GITHUB_OUTPUT"
