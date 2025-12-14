# Quick Start Guide

## Zero-Install Setup (Recommended)

No installation needed! Just configure your MCP client to use `npx`.

### Configure Your MCP Client

Add this to your MCP client configuration (e.g., Claude Desktop, Cline, etc.):

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

**Benefits:**
- ✅ No installation required
- ✅ Always uses latest version
- ✅ Works across any machine
- ✅ No path configuration needed

### Configuration File Locations

**Claude Desktop (macOS):**
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Claude Desktop (Windows):**
```
%APPDATA%\Claude\claude_desktop_config.json
```

**Cline (VSCode):**
Edit your MCP settings in VSCode settings.

## Alternative: Global Install

If you prefer a global installation:

```bash
npm install -g @rwese/mcp-backlog
```

Then configure:
```json
{
  "mcpServers": {
    "backlog": {
      "command": "mcp-backlog"
    }
  }
}
```

## Alternative: Local Development

For development or customization:

```bash
git clone https://github.com/rwese/mcp-backlog.git
cd mcp-backlog
bun install
bun run build
```

Then configure:
```json
{
  "mcpServers": {
    "backlog": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-backlog/dist/index.js"]
    }
  }
}
```

## Usage Examples

### Create a Backlog Item

```json
{
  "tool": "backlog-write",
  "arguments": {
    "action": "create",
    "topic": "Implement User Authentication",
    "description": "Add JWT-based authentication to the API",
    "priority": "high"
  }
}
```

### List All Backlog Items

```json
{
  "tool": "backlog-read",
  "arguments": {}
}
```

### Add a Todo to a Backlog Item

```json
{
  "tool": "backlog-todo-write",
  "arguments": {
    "action": "create",
    "topic": "Implement User Authentication",
    "content": "Set up JWT library and middleware"
  }
}
```

### Mark a Todo as Done

```json
{
  "tool": "backlog-todo-done",
  "arguments": {
    "action": "done",
    "topic": "Implement User Authentication",
    "todoId": "1"
  }
}
```

### Complete a Backlog Item

```json
{
  "tool": "backlog-done",
  "arguments": {
    "topic": "Implement User Authentication",
    "summary": "Successfully implemented JWT authentication with refresh tokens"
  }
}
```

## Workflow

1. **Create** → Item starts in "new" status
2. **Submit** → Moves to "ready" (ready for work)
3. Work on it, add todos as needed
4. **Amend** to "review" when done
5. **Approve** → Moves to "done"
6. **Done** → Archives the item

## Directory Structure

The server creates a `.agent/` directory in your current working directory:

```
.agent/
├── Backlog/
│   └── implement-user-authentication/
│       ├── item.md       # Backlog item with frontmatter
│       └── todos.json    # List of todos
└── COMPLETED_Backlog/
    └── DONE_implement-user-authentication.md
```

## Troubleshooting

### Server won't start
- Make sure you've run `bun run build`
- Check that the path in your MCP config is correct
- Verify Node.js is installed

### Can't create backlog items
- The server creates files in the current working directory
- Make sure you have write permissions
- The `.agent/` directory will be created automatically

### Dependencies
- Node.js (v18 or higher recommended)
- Or Bun runtime

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Check [CONTRIBUTING.md](CONTRIBUTING.md) for development setup
- Explore the examples in the README
