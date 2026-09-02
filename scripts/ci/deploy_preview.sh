#!/usr/bin/env bash
set -euo pipefail

HEAD_REPO="${HEAD_REPO:-}"
BASE_REPO="${BASE_REPO:-}"
PR_NUMBER="${PR_NUMBER:-}"
GITHUB_OUTPUT="${GITHUB_OUTPUT:-/dev/null}"

# Cloudflare Workers Builds automatically provisions preview environments
if [ "$HEAD_REPO" = "$BASE_REPO" ] && [ -n "$PR_NUMBER" ]; then
  DEPLOYMENT_URL="https://dev-qrcraftly.fpderuiter.workers.dev"
else
  DEPLOYMENT_URL="https://dev-qrcraftly.fpderuiter.workers.dev"
fi

echo "Preview Staging URL: $DEPLOYMENT_URL"
echo "deployment-url=$DEPLOYMENT_URL" >> "$GITHUB_OUTPUT"
