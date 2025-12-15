import { tool } from "@opencode-ai/plugin";
import { listTodos } from "../lib/backlog-todo-shared";
import { format } from "../lib/markdown-formatter";

export default tool({
  description: "Read-only access to backlog todos - list and filter todos for a backlog item",
  args: {
    topic: tool.schema
      .string()
      .describe("Backlog topic to read todos from"),
    status: tool.schema
      .enum(["pending", "in_progress", "completed", "cancelled"])
      .optional()
      .describe("Filter todos by status"),
    batch: tool.schema
      .string()
      .optional()
      .describe("Filter todos by batch identifier"),
  },

  async execute(args, context) {
    const { topic, status, batch } = args;
    
    // Call listTodos with filters
    const todos = listTodos(topic, { status, batch });
    
    if (todos.length === 0) {
      return `No todos found for backlog: ${topic}`;
    }

    return format(todos, {
      columns: [
        { key: 'id' },
        { key: 'content' },
        { key: 'status' },
        { key: 'batch' },
        { key: 'dependencies' }
      ],
      forceTable: true
    });
  }
});