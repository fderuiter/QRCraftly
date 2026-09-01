#!/usr/bin/env bash
set -euo pipefail

VERSION="${VERSION:-}"
GITHUB_SHA="${GITHUB_SHA:-}"
GITHUB_EVENT_NAME="${GITHUB_EVENT_NAME:-}"
ROLLBACK="${ROLLBACK:-false}"

mkdir -p releases
DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
cat <<MANIFEST > "releases/manifest-${VERSION}.json"
{
  "version": "${VERSION}",
  "commit": "${GITHUB_SHA}",
  "date": "${DATE}",
  "trigger": "${GITHUB_EVENT_NAME}",
  "rollback": ${ROLLBACK:-false},
  "infrastructure": {
    "provider": "Cloudflare Pages",
    "project": "qrcraftly",
    "compatibility_date": "2024-09-23"
  }
}
MANIFEST
