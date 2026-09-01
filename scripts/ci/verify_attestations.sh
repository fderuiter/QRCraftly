#!/usr/bin/env bash
set -euo pipefail

VERSION="${VERSION:-}"
GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-}"

# Verify the attestation of the deployment manifest
gh attestation verify "releases/manifest-${VERSION}.json" --repo "$GITHUB_REPOSITORY"
# Verify attestation for a primary web build asset as a proxy for the whole directory
gh attestation verify dist/client/index.html --repo "$GITHUB_REPOSITORY"
