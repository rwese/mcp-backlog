#!/bin/bash
# Semantic versioning script for mcp-backlog
# Usage: ./scripts/version.sh [major|minor|patch] [--dry-run]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

BUMP_TYPE="${1:-patch}"
DRY_RUN=false

if [[ "$2" == "--dry-run" ]] || [[ "$1" == "--dry-run" ]]; then
    DRY_RUN=true
    if [[ "$1" == "--dry-run" ]]; then
        BUMP_TYPE="patch"
    fi
fi

# Get current version from package.json
CURRENT_VERSION=$(grep '"version"' "$REPO_ROOT/package.json" | sed 's/.*"version": "\([^"]*\)".*/\1/')

# Parse version components
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

# Bump version based on type
case "$BUMP_TYPE" in
    major)
        MAJOR=$((MAJOR + 1))
        MINOR=0
        PATCH=0
        ;;
    minor)
        MINOR=$((MINOR + 1))
        PATCH=0
        ;;
    patch)
        PATCH=$((PATCH + 1))
        ;;
    *)
        echo "Usage: $0 [major|minor|patch] [--dry-run]"
        exit 1
        ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"

echo "Current version: $CURRENT_VERSION"
echo "New version: $NEW_VERSION"
echo "Bump type: $BUMP_TYPE"

if [ "$DRY_RUN" = true ]; then
    echo "[DRY RUN] Would update package.json"
    echo "[DRY RUN] Would update src/index.ts"
    echo "[DRY RUN] Would create tag v$NEW_VERSION"
    exit 0
fi

# Update package.json
sed -i.bak "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" "$REPO_ROOT/package.json"
rm -f "$REPO_ROOT/package.json.bak"

# Update VERSION in src/index.ts
sed -i.bak "s/const VERSION = \"$CURRENT_VERSION\"/const VERSION = \"$NEW_VERSION\"/" "$REPO_ROOT/src/index.ts"
rm -f "$REPO_ROOT/src/index.ts.bak"

echo "Updated package.json and src/index.ts to version $NEW_VERSION"

# Stage changes
git add "$REPO_ROOT/package.json" "$REPO_ROOT/src/index.ts"

# Commit version bump
git commit -m "chore: bump version to $NEW_VERSION"

# Create tag
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"

echo ""
echo "Version bumped to $NEW_VERSION"
echo "Tag v$NEW_VERSION created"
echo ""
echo "To push changes and tag:"
echo "  git push && git push --tags"
