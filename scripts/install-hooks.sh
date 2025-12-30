#!/bin/bash
# Install git hooks for mcp-backlog

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
HOOKS_DIR="$REPO_ROOT/.git/hooks"

# Handle worktree case
if [ -f "$REPO_ROOT/.git" ]; then
    HOOKS_DIR=$(cat "$REPO_ROOT/.git" | sed 's/gitdir: //')/hooks
fi

echo "Installing pre-commit hook..."
cp "$SCRIPT_DIR/pre-commit" "$HOOKS_DIR/pre-commit"
chmod +x "$HOOKS_DIR/pre-commit"
echo "Pre-commit hook installed successfully!"
