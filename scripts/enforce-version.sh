#!/bin/bash

# If we are in a pull request
if [ -n "$GITHUB_BASE_REF" ]; then
  # Fetch the base branch
  git fetch origin $GITHUB_BASE_REF --depth=1
  
  # Check if version field in package.json has changed
  if git diff origin/$GITHUB_BASE_REF HEAD package.json | grep -E '^\+[ \t]*"version":'; then
    echo "Error: Manual version bumps in package.json are not allowed."
    echo "The version is automatically managed by semantic-release."
    exit 1
  fi
fi
