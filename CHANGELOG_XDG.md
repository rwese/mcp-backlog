# XDG Base Directory & Multi-Project Support

## Overview

This update adds XDG Base Directory Specification compliance and multi-project isolation to mcp-backlog.

## Key Features

### 1. XDG Base Directory Compliance
- **Default storage**: `~/.local/share/mcp-backlog/` instead of `./.agent/`
- **Respects** `XDG_DATA_HOME`, `XDG_CONFIG_HOME`, `XDG_CACHE_HOME` environment variables
- **Follows** [XDG Base Directory Specification](https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html)

### 2. Multi-Project Isolation
Each project automatically gets its own isolated backlog directory:
- **Git repositories**: Identified by git root directory name
- **Non-git projects**: Identified by directory name + content hash

Example structure:
```
~/.local/share/mcp-backlog/
└── projects/
    ├── website/          # Git repo: ~/dev/website
    ├── api-server/       # Git repo: ~/dev/api-server
    └── experiment-a1b2/  # Non-git: ~/tmp/experiment
```

### 3. Environment Variable Configuration
- `MCP_BACKLOG_DIR`: Override entire backlog storage location
- `XDG_DATA_HOME`: Override XDG data directory (affects all XDG apps)
- Configured via MCP client config or shell environment

### 4. Legacy Compatibility
- Existing `.agent/` directories in the current working directory are automatically detected and used
- No breaking changes for existing users
- Seamless migration path

## Files Changed

### New Files
- `lib/path-resolver.ts` - Path resolution and project identification logic
- `tests/test-path-resolver.test.js` - Comprehensive tests for path resolution
- `scripts/show-paths.js` - Utility to display current path configuration
- `CONFIGURATION.md` - Detailed configuration documentation

### Modified Files
- `src/index.ts` - Updated all file operations to use path resolver
- `lib/backlog-shared.ts` - Updated to use dynamic paths
- `lib/backlog-todo-shared.ts` - Updated to use dynamic paths
- `README.md` - Added multi-project and XDG documentation
- `package.json` - Added `show-paths` script

## Usage

### Default Behavior
Just use the server as normal - it will automatically use XDG-compliant directories with project isolation.

### Custom Location
Set via MCP client configuration:
```json
{
  "mcpServers": {
    "backlog": {
      "command": "mcp-backlog",
      "env": {
        "MCP_BACKLOG_DIR": "/custom/path"
      }
    }
  }
}
```

### Check Configuration
```bash
bun run show-paths
```

## Migration from Legacy `.agent/`

### Automatic Detection
If you have an existing `.agent/` directory, it will be used automatically - no action needed.

### Manual Migration (Optional)
To migrate to XDG directory:

1. Find your project's XDG path:
   ```bash
   bun run show-paths
   ```

2. Move the `.agent/` directory:
   ```bash
   # Example - use the path from step 1
   mkdir -p ~/.local/share/mcp-backlog/projects/myproject
   mv .agent/* ~/.local/share/mcp-backlog/projects/myproject/
   rmdir .agent
   ```

## Benefits

1. **Cleaner project directories**: No more `.agent/` clutter in your project root
2. **Multi-project workflow**: Work on multiple projects without conflicts
3. **Standards compliance**: Follows established XDG conventions
4. **Centralized backlog**: All project backlogs in one location
5. **Better organization**: Easy to backup, sync, or manage all backlogs
6. **Flexible configuration**: Environment variables for custom setups

## Testing

All tests pass, including new path resolver tests:
```bash
bun test test-path-resolver  # 11 tests, all passing
```

## Backward Compatibility

✅ Existing users with `.agent/` directories: No changes needed
✅ New users: Automatically get XDG-compliant directories
✅ Custom configurations: Environment variables work as expected
✅ No breaking changes to the API or data format

## Future Enhancements

Potential future additions:
- Migration utility tool
- XDG_CONFIG_HOME support for user preferences
- XDG_CACHE_HOME for temporary data
- Windows-specific path conventions
- Shared team backlog synchronization helpers
