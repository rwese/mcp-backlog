# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2024-12-30

### Breaking Changes

- **Renamed MCP tools**: `todo-*` tools renamed to `ticket-*` to avoid conflicts with built-in todo commands
  - `todo-read` → `ticket-read`
  - `todo-write` → `ticket-write`
  - `todo-done` → `ticket-done`

### Added

- **Pre-commit hooks**: Automatic build and test validation before commits
  - `scripts/pre-commit` - runs build and tests
  - `scripts/install-hooks.sh` - installs hooks (handles git worktrees)
  - `prepare` npm script for automatic hook installation on `npm install`

- **Semver versioning script**: `scripts/version.sh` for semantic version management
  - Supports `major`, `minor`, `patch` bump types
  - `--dry-run` option for safe previews
  - Updates both `package.json` and `src/index.ts` VERSION constant
  - Creates git tags automatically
  - New npm scripts: `version:patch`, `version:minor`, `version:major`

### Changed

- Renamed source files for consistency:
  - `src/backlog-todo-done.ts` → `src/backlog-ticket-done.ts`
  - `src/backlog-todo-read.ts` → `src/backlog-ticket-read.ts`
  - `src/backlog-todo-write.ts` → `src/backlog-ticket-write.ts`
  - `lib/backlog-todo-shared.ts` → `lib/backlog-ticket-shared.ts`

### Fixed

- Test compatibility with git worktrees

## [1.1.0] - 2024-12-14

### Added

- **XDG Base Directory Support**: Backlogs now stored in `~/.local/share/mcp-backlog/` by default
- **Multi-Project Isolation**: Each project gets its own isolated backlog directory
- **Environment Variable Configuration**: `MCP_BACKLOG_DIR` and `XDG_DATA_HOME` support
- **Path Configuration Utility**: `bun run show-paths` to view current paths
- **CLI Commands**: `help`, `info`, `version`, and `list` commands
- **Single Item Fetch**: Fetch backlog item by topic with full content
- **Simplified Tool Names**: Removed redundant `backlog-` prefix from MCP tools
- **Workflow Guidance**: Action returns now include helpful next-step hints
- **Age Tracking**: Backlog items show age and staleness detection

### Changed

- Default storage location from `./.agent/` to `~/.local/share/mcp-backlog/`
- Tool names simplified (e.g., `backlog-read` → `read`)

### Fixed

- Module import resolution for plugin systems
- Critical MCP server bugs
- Bundling and Node.js compatibility issues

## [1.0.0] - 2024-12-01

### Added

- Initial release
- Backlog item CRUD operations (create, read, update, delete)
- Status workflow: `new` → `ready` → `review` → `done`
- Priority management: `high`, `medium`, `low`
- Todo/ticket management with dependencies
- Batch grouping for sub-agent workflows
- MCP server implementation with stdio transport

---

## Migration Guide

### From v1.1.x to v1.2.0

**Tool Rename Required**: Update your MCP client configurations and any scripts that reference the old tool names:

| Old Name     | New Name       |
| ------------ | -------------- |
| `todo-read`  | `ticket-read`  |
| `todo-write` | `ticket-write` |
| `todo-done`  | `ticket-done`  |

Example MCP client config update:

```json
{
  "mcpServers": {
    "backlog": {
      "command": "npx",
      "args": ["-y", "@rwese/mcp-backlog"]
    }
  }
}
```

The backlog data format remains unchanged - only the MCP tool interface names changed.

### From v1.0.x to v1.1.x

See [RELEASE_NOTES_v1.1.0.md](./RELEASE_NOTES_v1.1.0.md) for detailed migration instructions.

[1.2.0]: https://github.com/rwese/mcp-backlog/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/rwese/mcp-backlog/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/rwese/mcp-backlog/releases/tag/v1.0.0
