# Contributing to MCP Backlog

## Development Setup

1. Clone the repository
2. Install dependencies: `bun install`
3. Build the project: `bun run build`

## Project Structure

```
mcp-backlog/
├── src/              # MCP server implementation
│   ├── index.ts      # Main MCP server
│   └── backlog-*.ts  # Original tool files (for reference)
├── lib/              # Shared libraries
│   ├── backlog-shared.ts
│   ├── backlog-ticket-shared.ts
│   └── markdown-formatter.ts
├── tests/            # Test files
└── dist/             # Built output
```

## Building

```bash
bun run build
```

This creates a bundled `dist/index.js` file that can be run with Node.js.

## Testing

```bash
bun test
```

Note: The test files were copied from the original opencode project and may need adaptation for the MCP context.

## Making Changes

1. Edit files in `src/` or `lib/`
2. Build the project: `bun run build`
3. Test your changes
4. Submit a pull request

## Code Style

- Use TypeScript
- Follow existing code patterns
- Add JSDoc comments for public APIs
- Keep functions focused and small
