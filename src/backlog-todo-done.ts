import { tool } from "@opencode-ai/plugin";
import { 
  readTodos, 
  updateTodoStatus, 
  validateDependencies,
  listTodos 
} from "../lib/backlog-todo-shared";

export default tool({
  description: "Mark backlog todos as complete with dependency validation",
  args: {
    action: tool.schema
      .enum(["done", "list"])
      .describe("Action to perform"),
    topic: tool.schema
      .string()
      .describe("Backlog topic"),
    todoId: tool.schema
      .string()
      .optional()
      .describe("Todo ID to mark complete (required for done)"),
    status: tool.schema
      .enum(["pending", "in_progress", "completed", "cancelled"])
      .optional()
      .describe("Filter for list action"),
    batch: tool.schema
      .string()
      .optional()
      .describe("Filter for list action"),
  },

  async execute(args, context) {
    const { action, topic, todoId, status, batch } = args;

    if (action === "done") {
      if (!todoId) {
        throw new Error("todoId is required for done action");
      }

      const data = await readTodos(topic);

      // Validate dependencies
      const validation = validateDependencies(data.todos, todoId);

      if (!validation.valid) {
        const errors = [];
        if (validation.missing.length > 0) {
          errors.push(`Missing dependencies: ${validation.missing.join(", ")}`);
        }
        if (validation.incomplete.length > 0) {
          errors.push(`Incomplete dependencies: ${validation.incomplete.join(", ")}`);
        }
        throw new Error(`Cannot mark todo ${todoId} as complete. ${errors.join(". ")}`);
      }

      // Mark complete
      const todo = await updateTodoStatus(topic, todoId, "completed");

      return JSON.stringify({ completed: todo }, null, 2);
    }

    if (action === "list") {
      const todos = await listTodos(topic, { status, batch });

      if (todos.length === 0) {
        return `No todos found for backlog: ${topic}`;
      }

      return JSON.stringify({ backlogTopic: topic, todos }, null, 2);
    }

    throw new Error(`Unknown action: ${action}`);
  }
});