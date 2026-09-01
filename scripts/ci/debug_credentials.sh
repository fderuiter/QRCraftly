#!/usr/bin/env bash
set -euo pipefail

HEAD_REPO="${HEAD_REPO:-}"
BASE_REPO="${BASE_REPO:-}"
CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-}"
CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-}"

if [ "$HEAD_REPO" = "$BASE_REPO" ]; then
  echo "Pull request origin: Internal branch ($HEAD_REPO)"
  echo "Execution Mode: Live Cloud Deployment"
else
  echo "Pull request origin: External fork ($HEAD_REPO)"
  echo "Execution Mode: Local Mock Preview"
fi

if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
  echo "CLOUDFLARE_API_TOKEN is empty"
else
  echo "CLOUDFLARE_API_TOKEN is present (length: ${#CLOUDFLARE_API_TOKEN})"
fi

if [ -z "$CLOUDFLARE_ACCOUNT_ID" ]; then
  echo "CLOUDFLARE_ACCOUNT_ID is empty"
else
  echo "CLOUDFLARE_ACCOUNT_ID is present (length: ${#CLOUDFLARE_ACCOUNT_ID})"
fi
