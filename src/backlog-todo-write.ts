import { tool } from "@opencode-ai/plugin";
import {
  createTodo,
  readTodos,
  writeTodos,
  listTodos
} from "../lib/backlog-todo-shared.js";

export default tool({
  description: "Write access to backlog todos - create and update todos for backlog items",
  args: {
    action: tool.schema
      .enum(["create", "update", "list"])
      .describe("Action to perform"),
    topic: tool.schema
      .string()
      .describe("Backlog topic"),
    content: tool.schema
      .string()
      .optional()
      .describe("Todo content (required for create)"),
    todoId: tool.schema
      .string()
      .optional()
      .describe("Todo ID (required for update)"),
    status: tool.schema
      .enum(["pending", "in_progress", "completed", "cancelled"])
      .optional()
      .describe("Status for update, or filter for list"),
    batch: tool.schema
      .string()
      .optional()
      .describe("Batch identifier for grouping (optional for create/update, filter for list)"),
    dependencies: tool.schema
      .array(tool.schema.string())
      .optional()
      .describe("Array of todo IDs this todo depends on"),
  },

  async execute(args, context) {
    const { action, topic, content, todoId, status, batch, dependencies } = args;

    if (action === "create") {
      if (!content) {
        throw new Error("content is required for create action");
      }

      const todo = createTodo(topic, content, context);

      // Update batch/dependencies if provided
      if (batch || dependencies) {
        const data = readTodos(topic);
        const foundTodo = data.todos.find(t => t.id === todo.id);
        if (foundTodo) {
          if (batch) foundTodo.batch = batch;
          if (dependencies) foundTodo.dependencies = dependencies;
          writeTodos(topic, data);
          // Return the updated todo
          return JSON.stringify({ created: foundTodo }, null, 2);
        }
      }

      return JSON.stringify({ created: todo }, null, 2);
    }

    if (action === "update") {
      if (!todoId) {
        throw new Error("todoId is required for update action");
      }

      const data = readTodos(topic);
      const todo = data.todos.find(t => t.id === todoId);

      if (!todo) {
        throw new Error(`Todo ${todoId} not found in backlog: ${topic}`);
      }

      // Update fields
      if (status) todo.status = status;
      if (batch !== undefined) todo.batch = batch;
      if (dependencies) todo.dependencies = dependencies;

      writeTodos(topic, data);

      return JSON.stringify({ updated: todo }, null, 2);
    }

    if (action === "list") {
      const todos = listTodos(topic, { status, batch });

      if (todos.length === 0) {
        return `No todos found for backlog: ${topic}`;
      }

      return JSON.stringify({ backlogTopic: topic, todos }, null, 2);
    }

    throw new Error(`Unknown action: ${action}`);
  }
});