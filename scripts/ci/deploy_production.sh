#!/usr/bin/env bash
set -euo pipefail

GITHUB_OUTPUT="${GITHUB_OUTPUT:-/dev/null}"
DEPLOYMENT_URL="https://qrcraftly.fpderuiter.workers.dev"

echo "Production Environment is managed by Cloudflare Workers Builds."
echo "Active Production URL: $DEPLOYMENT_URL"
echo "deployment-url=$DEPLOYMENT_URL" >> "$GITHUB_OUTPUT"
