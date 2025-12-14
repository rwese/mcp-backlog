# MCP Configuration Guide

This guide shows how to configure `mcp-backlog` in various MCP clients.

## Recommended: NPX (Zero Install)

The easiest way to use mcp-backlog across any machine without installation.

### Configuration

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

**Explanation:**
- `npx` - Node.js package executor
- `-y` - Auto-confirm installation (no prompts)
- `@rwese/mcp-backlog` - The package name

**Pros:**
- ✅ No installation needed
- ✅ Works on any machine with Node.js
- ✅ Always pulls latest version
- ✅ No PATH configuration
- ✅ Easy to share configuration

**Cons:**
- ⚠️ First run downloads package (~500KB)
- ⚠️ Requires internet connection for first run

## Option 2: Global NPM Install

Install once, use everywhere on the machine.

### Installation

```bash
npm install -g @rwese/mcp-backlog
```

### Configuration

```json
{
  "mcpServers": {
    "backlog": {
      "command": "mcp-backlog"
    }
  }
}
```

**Pros:**
- ✅ Faster startup (no download)
- ✅ Works offline
- ✅ Version pinned

**Cons:**
- ⚠️ Requires installation on each machine
- ⚠️ Need to manually update (`npm update -g @rwese/mcp-backlog`)

## Option 3: Local Development Build

For development or customization.

### Setup

```bash
git clone https://github.com/rwese/mcp-backlog.git ~/mcp-backlog
cd ~/mcp-backlog
npm install  # or bun install
npm run build  # or bun run build
```

### Configuration

```json
{
  "mcpServers": {
    "backlog": {
      "command": "node",
      "args": ["/Users/YOUR_USERNAME/mcp-backlog/dist/index.js"]
    }
  }
}
```

**Note:** Replace `/Users/YOUR_USERNAME` with your actual home directory path.

**Pros:**
- ✅ Full control over code
- ✅ Can modify and extend
- ✅ No external dependencies after clone

**Cons:**
- ⚠️ Need to manage updates manually
- ⚠️ Requires absolute path in config
- ⚠️ Different path per machine

## MCP Client Configuration Locations

### Claude Desktop

**macOS:**
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

**Linux:**
```
~/.config/Claude/claude_desktop_config.json
```

### Cline (VSCode Extension)

Open VSCode Settings:
1. Press `Cmd/Ctrl + ,`
2. Search for "MCP"
3. Edit the MCP servers configuration

Or edit `settings.json` directly.

### Other MCP Clients

Check your client's documentation for MCP server configuration location.

## Complete Configuration Example

Here's a complete Claude Desktop configuration with mcp-backlog:

```json
{
  "mcpServers": {
    "backlog": {
      "command": "npx",
      "args": ["-y", "@rwese/mcp-backlog"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

## Testing Your Configuration

After configuring:

1. **Restart your MCP client** (completely quit and reopen)
2. **Check for errors** in the client's log/console
3. **Verify tools are loaded**:
   - In Claude Desktop: Start a new conversation and check available tools
   - Tools should include: `backlog-read`, `backlog-write`, `backlog-done`, etc.

## Troubleshooting

### "Command not found: npx"

**Solution:** Install Node.js from https://nodejs.org/

### "Package not found: @rwese/mcp-backlog"

**Solution:** 
1. Package may not be published yet to NPM
2. Use local development setup instead
3. Or wait for NPM publication

### "Permission denied"

**Solution:**
```bash
# For global install issues:
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH

# Then retry:
npm install -g @rwese/mcp-backlog
```

### Server starts but tools not available

**Solution:**
1. Check MCP client logs for errors
2. Verify JSON syntax in config file
3. Ensure complete restart of MCP client
4. Check `.agent/` directory is writable

## Environment Variables

You can pass environment variables to the server:

```json
{
  "mcpServers": {
    "backlog": {
      "command": "npx",
      "args": ["-y", "@rwese/mcp-backlog"],
      "env": {
        "BACKLOG_DIR": "/custom/path/.agent",
        "NODE_ENV": "production",
        "DEBUG": "mcp:*"
      }
    }
  }
}
```

## Working Directory

The server creates `.agent/` in the working directory. To control this:

```json
{
  "mcpServers": {
    "backlog": {
      "command": "npx",
      "args": ["-y", "@rwese/mcp-backlog"],
      "cwd": "/path/to/your/project"
    }
  }
}
```

## Multiple Instances

You can run multiple instances for different projects:

```json
{
  "mcpServers": {
    "backlog-work": {
      "command": "npx",
      "args": ["-y", "@rwese/mcp-backlog"],
      "cwd": "~/work-project"
    },
    "backlog-personal": {
      "command": "npx",
      "args": ["-y", "@rwese/mcp-backlog"],
      "cwd": "~/personal-project"
    }
  }
}
```

## Security Considerations

- The server creates and manages files in `.agent/` directory
- Ensure the working directory has appropriate permissions
- Review backlog items before marking as done (they move to `COMPLETED_Backlog/`)
- All data is stored locally in markdown and JSON files

## Next Steps

- Read [QUICKSTART.md](QUICKSTART.md) for usage examples
- Check [README.md](README.md) for full documentation
- See [PUBLISHING.md](PUBLISHING.md) for release information
