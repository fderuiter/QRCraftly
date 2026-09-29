#!/usr/bin/env bash
set -euo pipefail

# Waits until a Cloudflare Workers Builds deployment serves the expected build.
# Cloudflare builds and deploys on its own after a push, so smoke tests must not
# start until /version.json (written by scripts/write_build_info.js) reports the
# commit or release being verified.
#
# Env:
#   BASE_URL          Environment to poll, e.g. https://qrcraftly.com
#   EXPECTED_COMMIT   Full commit SHA to wait for (optional)
#   EXPECTED_VERSION  package.json version to wait for, without "v" (optional)
#   TIMEOUT_SECONDS   How long to wait before failing (default 900)

: "${BASE_URL:?BASE_URL is required}"
if [ -z "${EXPECTED_COMMIT:-}" ] && [ -z "${EXPECTED_VERSION:-}" ]; then
  echo "Set EXPECTED_COMMIT or EXPECTED_VERSION" >&2
  exit 1
fi

TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-900}"
INTERVAL=20
deadline=$(( $(date +%s) + TIMEOUT_SECONDS ))

while :; do
  body=$(curl -fsSL --max-time 15 "${BASE_URL%/}/version.json?ts=$(date +%s)" 2>/dev/null || true)
  commit=$(printf '%s' "$body" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{process.stdout.write(JSON.parse(s).commit||'')}catch{}})")
  version=$(printf '%s' "$body" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{process.stdout.write(JSON.parse(s).version||'')}catch{}})")

  if { [ -z "${EXPECTED_COMMIT:-}" ] || [ "$commit" = "$EXPECTED_COMMIT" ]; } &&
     { [ -z "${EXPECTED_VERSION:-}" ] || [ "$version" = "$EXPECTED_VERSION" ]; }; then
    echo "$BASE_URL is serving v${version} (${commit})"
    exit 0
  fi

  if [ "$(date +%s)" -ge "$deadline" ]; then
    echo "Timed out after ${TIMEOUT_SECONDS}s: $BASE_URL serves version='${version:-none}' commit='${commit:-none}'" >&2
    exit 1
  fi

  echo "Waiting for $BASE_URL (currently version='${version:-none}' commit='${commit:-none}')..."
  sleep "$INTERVAL"
done
