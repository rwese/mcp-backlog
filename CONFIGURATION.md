# Configuration Guide

## Data Storage Locations

### Default Behavior

MCP Backlog follows the [XDG Base Directory Specification](https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html) for storing data:

**Default location:**
```
~/.local/share/mcp-backlog/projects/<project-name>/
```

Each project is automatically isolated based on:
1. **Git repositories**: Uses the git root directory basename (e.g., `my-project` from `/path/to/my-project`)
2. **Non-git directories**: Uses directory basename + 8-character hash for uniqueness

### Environment Variables

#### MCP_BACKLOG_DIR
Override the entire backlog storage location:
```bash
export MCP_BACKLOG_DIR="/path/to/backlog"
```

This will store all projects at:
```
/path/to/backlog/projects/<project-name>/
```

#### XDG_DATA_HOME
Override the XDG data directory (affects all XDG-compliant applications):
```bash
export XDG_DATA_HOME="/custom/data"
```

Backlog will be stored at:
```
/custom/data/mcp-backlog/projects/<project-name>/
```

#### XDG_CONFIG_HOME
Location for configuration files (currently unused, reserved for future use):
```bash
export XDG_CONFIG_HOME="/custom/config"
```

#### XDG_CACHE_HOME
Location for cache files (currently unused, reserved for future use):
```bash
export XDG_CACHE_HOME="/custom/cache"
```

## MCP Client Configuration

### Using Environment Variables

**Claude Desktop (macOS)**
Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "backlog": {
      "command": "npx",
      "args": ["-y", "@rwese/mcp-backlog"],
      "env": {
        "MCP_BACKLOG_DIR": "/Users/yourname/Documents/backlogs"
      }
    }
  }
}
```

**Cline / Other Clients**
Add environment variables to your MCP server configuration:
```json
{
  "mcpServers": {
    "backlog": {
      "command": "mcp-backlog",
      "env": {
        "MCP_BACKLOG_DIR": "/custom/path",
        "XDG_DATA_HOME": "/another/path"
      }
    }
  }
}
```

### Using Shell Environment

Alternatively, set environment variables in your shell profile (`~/.bashrc`, `~/.zshrc`, etc.):
```bash
export MCP_BACKLOG_DIR="$HOME/Documents/backlogs"
```

Then use the basic configuration:
```json
{
  "mcpServers": {
    "backlog": {
      "command": "mcp-backlog"
    }
  }
}
```

## Multi-Project Workflow

### Automatic Project Detection

The server automatically detects which project you're working in based on your current working directory:

```bash
# Project A (git repo)
cd ~/projects/website
# Uses: ~/.local/share/mcp-backlog/projects/website/

# Project B (git repo)
cd ~/projects/api-server
# Uses: ~/.local/share/mcp-backlog/projects/api-server/

# Project C (non-git directory)
cd ~/tmp/experiment
# Uses: ~/.local/share/mcp-backlog/projects/experiment-a1b2c3d4/
```

### Sharing Backlogs Across Projects

If you want to share backlogs across multiple projects, use a custom `MCP_BACKLOG_DIR`:

```json
{
  "mcpServers": {
    "backlog": {
      "command": "mcp-backlog",
      "env": {
        "MCP_BACKLOG_DIR": "/Users/yourname/shared-backlogs"
      }
    }
  }
}
```

Projects will still be isolated under `shared-backlogs/projects/<project-name>/`.

### Using a Single Backlog for Everything

To disable project isolation and use a single backlog location:

1. Use the legacy `.agent` directory approach
2. Or use a custom script wrapper (advanced)

## Legacy `.agent` Directory Support

For backward compatibility, if you have an existing `.agent/` directory in your current working directory, it will be used instead of the XDG directory.

**Migration:**
1. The server automatically detects existing `.agent/` directories
2. New installations use XDG directories by default
3. To migrate, move `.agent/` contents to the XDG location:
   ```bash
   # Find your XDG location
   echo ~/.local/share/mcp-backlog/projects/$(basename $(git rev-parse --show-toplevel 2>/dev/null || echo $(basename $(pwd))))/
   
   # Or use the migration tool (future feature)
   ```

## Debugging Path Configuration

To see where your backlog data is being stored, you can inspect the path resolver module or add debug logging. The path resolution priority is:

1. `MCP_BACKLOG_DIR` environment variable → Use as-is with project isolation
2. Existing `.agent/` in current directory → Use legacy location (no project isolation)
3. `XDG_DATA_HOME/mcp-backlog` → XDG-compliant with project isolation
4. `~/.local/share/mcp-backlog` → Default fallback with project isolation

## Platform-Specific Defaults

### Linux / macOS
- Data: `~/.local/share/mcp-backlog/`
- Config: `~/.config/mcp-backlog/` (reserved)
- Cache: `~/.cache/mcp-backlog/` (reserved)

### Windows (WSL/Git Bash)
- Data: `~/.local/share/mcp-backlog/`
- Use forward slashes in paths

### Windows (Native - Future)
- Data: `%LOCALAPPDATA%\mcp-backlog\`
- Config: `%APPDATA%\mcp-backlog\`
- Cache: `%TEMP%\mcp-backlog\`

## Security Considerations

- Backlog files may contain sensitive project information
- Ensure appropriate file permissions on your backlog directory
- If using a shared filesystem, use `MCP_BACKLOG_DIR` to point to your home directory
- Git repositories are identified by directory name only (not by repository URL)

## Examples

### Consultant with Multiple Clients
```bash
# Set up client-specific locations
export MCP_BACKLOG_DIR="$HOME/Clients/acme-corp/backlogs"
```

### Team Shared Backlog (Advanced)
```bash
# Use a git-synced shared location
export MCP_BACKLOG_DIR="$HOME/Dropbox/team-backlogs"
# Then git init, commit, push to share with team
```

### Temporary/Experimental Projects
```bash
# Use system temp directory
export MCP_BACKLOG_DIR="/tmp/backlogs"
# Data will be cleaned up on reboot
```
