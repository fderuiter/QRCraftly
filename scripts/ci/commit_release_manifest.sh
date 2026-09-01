#!/usr/bin/env bash
set -euo pipefail

VERSION="${VERSION:-}"
GITHUB_REF_NAME="${GITHUB_REF_NAME:-}"

git config --global user.name "github-actions[bot]"
git config --global user.email "github-actions[bot]@users.noreply.github.com"
git add package.json releases/
if ! git diff --cached --quiet; then
  git commit -m "chore(release): version ${VERSION} [skip ci]"
else
  echo "No changes to commit"
  exit 0
fi

# Determine branch dynamically
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" = "HEAD" ]; then
  BRANCH=$(git branch --show-current)
fi
if [ -z "$BRANCH" ] || [ "$BRANCH" = "HEAD" ]; then
  BRANCH="${GITHUB_REF_NAME}"
fi
if [ -z "$BRANCH" ]; then
  BRANCH="main"
fi
echo "Determined branch: $BRANCH"

# Retry & Rebase Loop (up to 5 times)
SUCCESS=false
MAX_RETRIES=5
for (( i=1; i<=MAX_RETRIES; i++ )); do
  echo "Attempt $i of $MAX_RETRIES..."
  
  # Fetch latest branch history to resolve stale states
  if ! git fetch origin "$BRANCH"; then
    echo "git fetch failed"
    sleep 2
    continue
  fi
  
  # Rebase local version commits onto the newly retrieved head of the branch
  if ! git rebase origin/"$BRANCH"; then
    echo "git rebase failed, aborting"
    git rebase --abort
    sleep 2
    continue
  fi
  
  # Push the release updates
  if git push origin HEAD:"$BRANCH"; then
    echo "Push successful!"
    SUCCESS=true
    break
  else
    echo "git push failed"
    sleep 2
  fi
done

if [ "$SUCCESS" = "false" ]; then
  echo "Failed to rebase and push after $MAX_RETRIES attempts."
  exit 1
fi
