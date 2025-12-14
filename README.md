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

```bash
cd ~/Repos/mcp-backlog
bun install
```

## Usage

### As a standalone MCP server

```bash
bun run dev
```

### In your MCP client configuration

Add to your MCP client's configuration file:

```json
{
  "mcpServers": {
    "backlog": {
      "command": "bun",
      "args": ["run", "/Users/YOUR_USERNAME/Repos/mcp-backlog/src/index.ts"]
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

### backlog-todo-read
List todos for a backlog item.

**Arguments:**
- `topic`: Backlog item topic (required)
- `status` (optional): Filter by status
- `batch` (optional): Filter by batch

### backlog-todo-write
Create and update todos within backlog items.

**Arguments:**
- `action`: create, update, or list
- `topic`: Backlog item topic (required)
- `todoId`: Todo ID (for update)
- `content`: Todo content
- `status`: Todo status (pending, in_progress, completed, cancelled)
- `dependencies`: Array of todo IDs that must complete first
- `batch`: Batch identifier

### backlog-todo-done
Mark todos as complete with dependency validation.

**Arguments:**
- `action`: done or list
- `topic`: Backlog item topic (required)
- `todoId`: Todo ID to mark as done

## Directory Structure

The server creates and manages files in the `.agent/` directory:

```
.agent/
├── Backlog/
│   └── <topic-name>/
│       ├── item.md       # Backlog item details
│       └── todos.json    # Associated todos
└── COMPLETED_Backlog/
    ├── DONE_<topic>-v1.md
    └── WONTFIX_<topic>.md
```

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
