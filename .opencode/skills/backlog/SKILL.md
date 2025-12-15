---
name: backlog
description: Persistent backlog item and todo management via MCP server
license: MIT
---

# Backlog Skill

Manage persistent backlog items and todos across sessions using the MCP backlog server. This skill enables agents to track work, manage dependencies, and collaborate on project tasks.

## Backlog Item Lifecycle

Backlog items follow a defined workflow through these states:

- **new** → Initial state when created, awaiting submission
- **ready** → Item has been submitted and reviewed, ready for work
- **review** → Work is in progress or complete, pending final review
- **done** → Item successfully completed
- **reopen** → Item returned for revisions with feedback
- **wontfix** → Item marked as intentionally not addressed

## Available MCP Tools

### backlog-read
Read-only access to backlog items. Fetch single items with full content or list filtered items.

**Parameters:**
- `topic` (string, optional): Topic name to fetch single backlog item with full details
- `status` (string, enum: new|ready|review|done|reopen|wontfix): Filter by status
- `priority` (string, enum: high|medium|low): Filter by priority
- `showAge` (boolean): Include age information (default: true)

### backlog-write
Create and manage backlog items with full lifecycle control.

**Actions:**
- `create`: Create new backlog item (requires `topic`, `description`, optional `priority`)
- `list`: List backlog items (supports status/priority filters)
- `amend`: Update existing item (requires `topic`, optional `description`, `status`, `priority`)
- `submit`: Transition item from 'new' to 'ready' (requires `topic`)
- `approve`: Transition item from 'review' to 'done' (requires `topic`)
- `reopen`: Revert 'review' or 'done' to 'reopen' with notes (requires `topic`, `description`)
- `wontfix`: Mark item as intentionally not addressed (requires `topic`, optional `description`)

### backlog-done
Mark backlog items as complete with optional summary documentation.

**Parameters:**
- `topic` (string): Topic name to complete
- `summary` (string, optional): Completion summary with accomplishments and lessons learned

### backlog-todo-read
Read-only access to todos for a backlog item.

**Parameters:**
- `topic` (string, required): Topic name
- `status` (enum: pending|in_progress|completed|cancelled): Filter by status
- `batch` (string): Filter by batch identifier

### backlog-todo-write
Create and update todos with dependency tracking for backlog items.

**Actions:**
- `create`: Create new todo (requires `content`, optional `status`, `batch`, `dependencies`)
- `update`: Update existing todo (requires `todoId`, optional `content`, `status`, `batch`, `dependencies`)
- `list`: List todos with optional filtering

### backlog-todo-done
Mark todos as complete with automatic dependency validation.

**Parameters:**
- `todoId` (string, required for done action): Todo ID to complete
- `topic` (string, required): Backlog item topic
- `status` (enum: pending|in_progress|completed|cancelled): Filter by status for list action
- `batch` (string): Filter by batch for list action

## Usage Examples

### Create a Backlog Item

```javascript
const response = await mcp.call('backlog-write', {
  action: 'create',
  topic: 'Implement user authentication',
  description: 'Add OAuth2 integration for user login',
  priority: 'high'
});
// Returns: Created backlog item: /path/to/item.md
```

### Create Todos for an Item

```javascript
// Create first todo
const todo1 = await mcp.call('backlog-todo-write', {
  action: 'create',
  topic: 'Implement user authentication',
  content: 'Set up OAuth2 provider',
  batch: 'auth-setup'
});

// Create dependent todo
const todo2 = await mcp.call('backlog-todo-write', {
  action: 'create',
  topic: 'Implement user authentication',
  content: 'Add login UI component',
  batch: 'auth-setup',
  dependencies: [todo1.id]
});
```

### Complete a Todo with Dependencies

```javascript
// Mark todo as complete (will validate dependencies)
await mcp.call('backlog-todo-done', {
  action: 'done',
  topic: 'Implement user authentication',
  todoId: 'todo-123'
});
// Returns: Marked todo as done: todo-123
```

### Transition Item Status

```javascript
// Submit item from 'new' to 'ready'
await mcp.call('backlog-write', {
  action: 'submit',
  topic: 'Implement user authentication'
});

// Approve item from 'review' to 'done'
await mcp.call('backlog-write', {
  action: 'approve',
  topic: 'Implement user authentication'
});
```

### Complete an Item with Summary

```javascript
await mcp.call('backlog-done', {
  topic: 'Implement user authentication',
  summary: 'Successfully implemented OAuth2 integration with Google and GitHub providers. Added comprehensive test coverage and documented setup process.'
});
```

## Best Practices for Sub-Agent Delegation

### 1. Break Down Work into Todos
Always create todos within a backlog item for tracking sub-tasks:

```javascript
// Good: Create todos for sub-agent work
await mcp.call('backlog-todo-write', {
  action: 'create',
  topic: 'Feature: Search functionality',
  content: 'Implement search algorithm',
  batch: 'search-impl'
});
```

### 2. Use Batch Identifiers for Grouping
Organize todos by batch for sub-agents to filter and focus on related work:

```javascript
// Organize work by agent task
const batchId = `agent-${agentType}-${taskId}`;
await mcp.call('backlog-todo-write', {
  action: 'create',
  topic: 'Feature: Search functionality',
  content: 'Write unit tests',
  batch: batchId
});
```

### 3. Define Dependencies for Sequential Work
Use todo dependencies when work must be completed in order:

```javascript
// Backend must complete before frontend
const backend = await createTodo(..., { batch: 'search-backend' });
const frontend = await createTodo(..., { 
  batch: 'search-frontend',
  dependencies: [backend.id]
});
```

### 4. Validate Completion Before Marking Done
Always check dependencies before marking todos complete:

```javascript
// The system automatically validates dependencies
// This will fail if dependencies are not completed
await mcp.call('backlog-todo-done', {
  action: 'done',
  topic: 'Feature: Search functionality',
  todoId: frontendTodoId  // Will error if dependencies incomplete
});
```

### 5. Reference Completed Items for Context
Use backlog-read to fetch completed items for context on similar work:

```javascript
const completedItems = await mcp.call('backlog-read', {
  status: 'done',
  priority: 'high'
});
// Use these as references for current implementation
```

### 6. Use Status Transitions for Review
Progress items through workflow stages to track approval:

```javascript
// Create → Submit → Review → Approve
await mcp.call('backlog-write', {
  action: 'submit',
  topic: 'Feature: Search functionality'
});

// After implementation complete
await mcp.call('backlog-write', {
  action: 'amend',
  topic: 'Feature: Search functionality',
  status: 'review'
});

// After approval
await mcp.call('backlog-write', {
  action: 'approve',
  topic: 'Feature: Search functionality'
});
```

## Storage

Backlog items are persisted in XDG-compliant directories:

- **Backlog items**: `~/.local/share/mcp-backlog/projects/{projectName}/Backlog/`
- **Todos**: `~/.local/share/mcp-backlog/projects/{projectName}/Backlog/{itemName}/todos.json`
- **Completed items**: `~/.local/share/mcp-backlog/projects/{projectName}/COMPLETED_Backlog/`

Items persist across sessions and can be referenced by agents in future conversations.

## Status Codes

- **200 OK**: Operation successful
- **400 Bad Request**: Missing required parameters or invalid values
- **404 Not Found**: Backlog item or todo not found
- **409 Conflict**: Invalid status transition or dependency violation
