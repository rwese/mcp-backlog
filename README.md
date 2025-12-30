# MCP Backlog Server

A Model Context Protocol (MCP) server for managing backlog items and todos. This server provides a structured way to track work items, their status, and associated tasks.

## Features

- **Backlog Management**: Create, read, update, and archive backlog items
- **Todo Tracking**: Manage todos within backlog items with dependencies
- **Status Workflow**: Track items through states: new → ready → review → done
- **Priority Levels**: Organize items by high, medium, or low priority
- **Versioning**: Automatic versioning when amending backlog items
- **Markdown Storage**: Human-readable markdown files with frontmatter

## Installation

### Quick Start (Zero Install)

**Using NPX (Node.js):**

```bash
npx -y github:rwese/mcp-backlog
```

**Using Bunx (Bun - Faster):**

```bash
bunx --bun github:rwese/mcp-backlog
```

### Global Installation

**With Bun (Recommended):**

```bash
# From GitHub (latest)
bun add -g github:rwese/mcp-backlog

# From NPM (when published)
bun add -g @rwese/mcp-backlog
```

**With NPM:**

```bash
# From GitHub
npm install -g github:rwese/mcp-backlog

# From NPM (when published)
npm install -g @rwese/mcp-backlog
```

### From Source

```bash
git clone https://github.com/rwese/mcp-backlog.git
cd mcp-backlog
bun install  # or npm install
bun run build  # or npm run build
```

## Usage

### In your MCP client configuration

Add to your MCP client's configuration file:

**Using NPX from GitHub (Recommended):**

```json
{
  "mcpServers": {
    "backlog": {
      "command": "npx",
      "args": ["-y", "github:rwese/mcp-backlog"]
    }
  }
}
```

**Using Bunx (Faster):**

```json
{
  "mcpServers": {
    "backlog": {
      "command": "bunx",
      "args": ["--bun", "github:rwese/mcp-backlog"]
    }
  }
}
```

**Using global install:**

```json
{
  "mcpServers": {
    "backlog": {
      "command": "mcp-backlog"
    }
  }
}
```

**Using NPX:**

```json
{
  "mcpServers": {
    "backlog": {
      "command": "npx",
      "args": ["@rwese/mcp-backlog"]
    }
  }
}
```

**Using local build:**

```json
{
  "mcpServers": {
    "backlog": {
      "command": "node",
      "args": ["/path/to/mcp-backlog/dist/index.js"]
    }
  }
}
```

## Tools

### backlog-read

List and filter backlog items.

**Arguments:**

- `status` (optional): Filter by status (new, ready, review, done, reopen, wontfix)
- `priority` (optional): Filter by priority (high, medium, low)

### backlog-write

Create and manage backlog items.

**Arguments:**

- `action`: Operation to perform (create, list, amend, approve, submit, reopen, wontfix)
- `topic`: Topic name for the backlog item
- `description`: Description of the work item
- `priority` (optional): Priority level (default: medium)
- `status` (optional): Status for amend operation

**Examples:**

```javascript
// Create a new backlog item
{
  "action": "create",
  "topic": "Add user authentication",
  "description": "Implement JWT-based authentication",
  "priority": "high"
}

// Amend an existing item
{
  "action": "amend",
  "topic": "Add user authentication",
  "status": "ready"
}
```

### backlog-done

Mark backlog items as complete.

**Arguments:**

- `action`: done or list
- `topic`: Topic name to mark as done
- `summary` (optional): Completion summary

### ticket-read

List todos for a backlog item.

**Arguments:**

- `topic`: Backlog item topic (required)
- `status` (optional): Filter by status
- `batch` (optional): Filter by batch

### ticket-write

Create and update todos within backlog items.

**Arguments:**

- `action`: create, update, or list
- `topic`: Backlog item topic (required)
- `todoId`: Todo ID (for update)
- `content`: Todo content
- `status`: Todo status (pending, in_progress, completed, cancelled)
- `dependencies`: Array of todo IDs that must complete first
- `batch`: Batch identifier

### ticket-done

Mark todos as complete with dependency validation.

**Arguments:**

- `action`: done or list
- `topic`: Backlog item topic (required)
- `todoId`: Todo ID to mark as done

## Directory Structure

### Default Location (XDG-compliant)

By default, the server stores backlog data in XDG-compliant directories with multi-project isolation:

```
~/.local/share/mcp-backlog/
└── projects/
    └── <project-name>/
        ├── Backlog/
        │   └── <topic-name>/
        │       ├── item.md       # Backlog item details
        │       └── todos.json    # Associated todos
        └── COMPLETED_Backlog/
            ├── DONE_<topic>-v1.md
            └── WONTFIX_<topic>.md
```

### Multi-Project Support

Each project gets its own isolated directory:

- **Git repositories**: Uses the repository root directory name as project identifier
- **Non-git projects**: Uses directory name + hash for uniqueness

This allows you to use the same MCP server across multiple projects without conflicts.

### Legacy Support

For backward compatibility, if you have an existing `.agent/` directory in your current working directory, it will be used instead of the XDG directory.

### Custom Locations

You can override the default location using environment variables:

**Option 1: Set a custom backlog directory**

```bash
export MCP_BACKLOG_DIR="/path/to/your/backlog"
```

**Option 2: Set XDG_DATA_HOME (affects all XDG-compliant apps)**

```bash
export XDG_DATA_HOME="/path/to/data"
# Backlog will be stored at: /path/to/data/mcp-backlog/
```

Add these to your MCP client configuration:

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

## Configuration

See [CONFIGURATION.md](./CONFIGURATION.md) for detailed information about:

- XDG Base Directory support
- Multi-project isolation
- Environment variables
- Custom storage locations
- Platform-specific defaults

## Development

### Run tests

```bash
bun test
```

### Build

```bash
bun run build
```

## Workflow

1. **Create** a backlog item with status "new"
2. **Submit** to move it to "ready" (ready for work)
3. **Amend** to update status to "review" when work is done
4. **Approve** to move from "review" to "done"
5. **Done** to archive the completed item

Or use **reopen** to send items back for more work, or **wontfix** to archive without completing.

## License

MIT
