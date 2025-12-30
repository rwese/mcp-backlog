#!/bin/bash
# Script to commit documentation updates for todo → ticket rename

cd /Users/wese/Repos/mcp-backlog/worktrees/rename-tickets

echo "=== Git Status ==="
git status

echo "=== Adding all changes ==="
git add -A

echo "=== Committing with message: 'docs: update documentation for todo → ticket rename' ==="
git commit -m "docs: update documentation for todo → ticket rename"

echo "=== Commit Result ==="
git log -1 --oneline

echo "=== Git Status After Commit ==="
git status
