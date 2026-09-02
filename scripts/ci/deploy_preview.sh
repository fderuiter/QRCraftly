#!/usr/bin/env bash
set -euo pipefail

HEAD_REPO="${HEAD_REPO:-}"
BASE_REPO="${BASE_REPO:-}"
PR_NUMBER="${PR_NUMBER:-}"
GITHUB_OUTPUT="${GITHUB_OUTPUT:-/dev/null}"

if [ "$HEAD_REPO" = "$BASE_REPO" ]; then
  echo "Deploying preview to Cloudflare Pages (Live Cloud Deployment)..."
  pnpm exec wrangler pages project create qrcraftly --production-branch=main || true
else
  echo "External fork detected. Deploying in preview mode..."
fi

pnpm exec wrangler pages deploy dist/client --project-name=qrcraftly --branch="pr-${PR_NUMBER}" --commit-dirty > deploy_output.txt 2>&1 || { cat deploy_output.txt && exit 1; }
cat deploy_output.txt

DEPLOYMENT_URL=$( (grep -oE "https://[a-zA-Z0-9.-]+\.pages\.dev" deploy_output.txt || true) | tail -n 1)
if [ -z "$DEPLOYMENT_URL" ]; then
  echo "ERROR: Failed to extract Cloudflare Pages deployment URL." >&2
  exit 1
fi

echo "Extracted Deployment URL: $DEPLOYMENT_URL"
echo "deployment-url=$DEPLOYMENT_URL" >> "$GITHUB_OUTPUT"
