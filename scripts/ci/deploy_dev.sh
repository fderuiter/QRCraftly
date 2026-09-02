#!/usr/bin/env bash
set -euo pipefail

GITHUB_OUTPUT="${GITHUB_OUTPUT:-/dev/null}"
DEPLOYMENT_URL="https://dev-qrcraftly.fpderuiter.workers.dev"

echo "Preview Staging Environment is managed by Cloudflare Workers Builds."
echo "Active Staging URL: $DEPLOYMENT_URL"
echo "deployment-url=$DEPLOYMENT_URL" >> "$GITHUB_OUTPUT"
