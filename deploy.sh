#!/bin/bash

# Exit immediately on error
set -e

# 1. Grab the tag from the first command-line argument
TAG=$1

# 2. Validation: Ensure a tag was provided and starts with 'v'
if [[ -z "$TAG" ]]; then
  echo "❌ Error: No tag provided."
  echo "Usage: ./deploy.sh v1.0.0"
  exit 1
fi

if [[ ! "$TAG" =~ ^v[0-9] ]]; then
  echo "❌ Error: Tag '$TAG' is invalid. It must start with 'v' followed by a number (e.g., v0.0.1)."
  exit 1
fi

# Strip the 'v' for the actual npm version number (e.g., v1.0.0 -> 1.0.0)
VERSION=${TAG#v}

echo "🚀 Starting deployment for @ngx-axon/core version: $VERSION"

cp README.md projects/axon/README.md
cp LICENCE.md projects/axon/LICENCE.md

# 3. Clean Install & Build
echo "📦 Installing dependencies..."
npm ci

echo "🏗️  Building Angular library..."
npm run build axon

# 4. Navigate to build output
# Adjust this path if your build output location changes
TARGET_DIR="dist/axon"

if [ -d "$TARGET_DIR" ]; then
  cd "$TARGET_DIR"
else
  echo "❌ Error: Build directory '$TARGET_DIR' not found. Check your Angular build config."
  exit 1
fi

# 5. Sync version (Optional but safe)
# This ensures the package.json being published matches the tag you provided
echo "🔢 Setting package version to $VERSION..."
npm version "$VERSION" --no-git-tag-version --allow-same-version # TODO remove --allow-same-version once we have a real version bump workflow in place

# 6. Publish
# We use --provenance for the 2026 security standard.
# Assumes OIDC/Trusted Publishing is configured for this headless environment.
echo "🚢 Publishing to npm..."
npm publish --access public ## --provenance TODO re-enable --provenance once we have OIDC/Trusted Publishing configured for this headless environment

echo "✅ Successfully deployed $TAG to npm!"

rm projects/axon/README.md
rm projects/axon/LICENCE.md