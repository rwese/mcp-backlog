import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "node:fs";
import { join } from "path";

// Import the tools
import backlogTodoRead from "../tool/backlog-todo-read.ts";
import backlogTodoWrite from "../tool/backlog-todo-write.ts";
import backlogTodoDone from "../tool/backlog-todo-done.ts";

// Import shared functions
import {
  getTodosFilePath,
  ensureTodosDirectory,
  readTodos,
  writeTodos,
  createTodo,
  updateTodoStatus,
  listTodos,
  validateDependencies
} from "../lib/backlog-todo-shared.js";

describe("Backlog Todo Tools", () => {
  const testAgentDir = ".agent-test";
  const backlogDir = join(testAgentDir, "Backlog");
  const completedDir = join(testAgentDir, "COMPLETED_Backlog");

  // Mock context for testing
  const mockContext = {
    agent: "test-agent",
    sessionID: "test-session-123"
  };

  beforeEach(() => {
    // Clean up any existing test directories
    if (fs.existsSync(testAgentDir)) {
      fs.rmSync(testAgentDir, { recursive: true, force: true });
    }

    // Create test directories
    fs.mkdirSync(backlogDir, { recursive: true });
    fs.mkdirSync(completedDir, { recursive: true });

    // Mock the directories in the tools by temporarily changing process.cwd or using environment
    // Since the tools hardcode ".agent/", we'll need to work around this
    // For now, create the directories in the actual location
    if (!fs.existsSync(".agent")) {
      fs.mkdirSync(".agent/Backlog", { recursive: true });
      fs.mkdirSync(".agent/COMPLETED_Backlog", { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test directories
    if (fs.existsSync(testAgentDir)) {
      fs.rmSync(testAgentDir, { recursive: true, force: true });
    }
    if (fs.existsSync(".agent")) {
      fs.rmSync(".agent", { recursive: true, force: true });
    }
  });

  describe("backlog-todo-shared", () => {
    const testTopic = "test-backlog";
    const context = { agent: "test-agent", sessionID: "test-session" };

    beforeEach(() => {
      // Clean up test files
      const filePath = getTodosFilePath(testTopic);
      if (fs.existsSync(filePath)) {
        fs.rmSync(filePath);
      }
    });

    afterEach(() => {
      // Clean up test files
      const filePath = getTodosFilePath(testTopic);
      if (fs.existsSync(filePath)) {
        fs.rmSync(filePath);
      }
      const dirPath = `.agent/Backlog/${testTopic}`;
      if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true });
      }
    });

    it("should generate correct todos file path", () => {
      const path = getTodosFilePath("test-topic");
      expect(path).toBe(".agent/Backlog/test-topic/todos.json");
    });

    it("should create todos directory", () => {
      const dirPath = `.agent/Backlog/${testTopic}`;
      expect(fs.existsSync(dirPath)).toBe(false);
      ensureTodosDirectory(testTopic);
      expect(fs.existsSync(dirPath)).toBe(true);
    });

    it("should read empty todos file", () => {
      const data = readTodos(testTopic);
      expect(data.backlogTopic).toBe(testTopic);
      expect(data.todos).toEqual([]);
    });

    it("should create a todo", () => {
      const todo = createTodo(testTopic, "Test todo content", context);
      expect(todo.id).toBe("1");
      expect(todo.content).toBe("Test todo content");
      expect(todo.status).toBe("pending");
      expect(todo.batch).toBe(null);
      expect(todo.dependencies).toEqual([]);
      expect(todo.agent).toBe(context.agent);
      expect(todo.session).toBe(context.sessionID);

      // Verify it was written
      const data = readTodos(testTopic);
      expect(data.todos.length).toBe(1);
      expect(data.todos[0]).toEqual(todo);
    });

    it("should update todo status", () => {
      const todo = createTodo(testTopic, "Test content", context);
      const updated = updateTodoStatus(testTopic, todo.id, "completed");
      expect(updated.status).toBe("completed");

      // Verify in data
      const data = readTodos(testTopic);
      expect(data.todos[0].status).toBe("completed");
    });

    it("should throw error for invalid status", () => {
      const todo = createTodo(testTopic, "Test content", context);
      expect(() => updateTodoStatus(testTopic, todo.id, "invalid")).toThrow(
        "Invalid status: invalid. Must be one of: pending, in_progress, completed, cancelled"
      );
    });

    it("should throw error for non-existent todo", () => {
      expect(() => updateTodoStatus(testTopic, "999", "completed")).toThrow(
        "Todo with ID 999 not found in topic test-backlog"
      );
    });

    it("should list todos with filters", () => {
      const todo1 = createTodo(testTopic, "Todo 1", context);
      const todo2 = createTodo(testTopic, "Todo 2", context);
      updateTodoStatus(testTopic, todo2.id, "completed");

      // No filter
      let todos = listTodos(testTopic);
      expect(todos.length).toBe(2);

      // Status filter
      todos = listTodos(testTopic, { status: "pending" });
      expect(todos.length).toBe(1);
      expect(todos[0].id).toBe(todo1.id);

      todos = listTodos(testTopic, { status: "completed" });
      expect(todos.length).toBe(1);
      expect(todos[0].id).toBe(todo2.id);
    });

    it("should validate dependencies correctly", () => {
      const todo1 = createTodo(testTopic, "Todo 1", context);
      const todo2 = createTodo(testTopic, "Todo 2", context);
      const todo3 = createTodo(testTopic, "Todo 3", context);

      // Set dependencies
      const data = readTodos(testTopic);
      data.todos[2].dependencies = [todo1.id, todo2.id];
      writeTodos(testTopic, data);

      // All dependencies pending - should be invalid
      let validation = validateDependencies(data.todos, todo3.id);
      expect(validation.valid).toBe(false);
      expect(validation.missing).toEqual([]);
      expect(validation.incomplete).toEqual([todo1.id, todo2.id]);

      // Complete one dependency
      updateTodoStatus(testTopic, todo1.id, "completed");
      const updatedData = readTodos(testTopic);
      validation = validateDependencies(updatedData.todos, todo3.id);
      expect(validation.valid).toBe(false);
      expect(validation.incomplete).toEqual([todo2.id]);

      // Complete both dependencies
      updateTodoStatus(testTopic, todo2.id, "completed");
      const finalData = readTodos(testTopic);
      validation = validateDependencies(finalData.todos, todo3.id);
      expect(validation.valid).toBe(true);
      expect(validation.missing).toEqual([]);
      expect(validation.incomplete).toEqual([]);
    });

    it("should detect missing dependencies", () => {
      const todo = createTodo(testTopic, "Todo with missing dep", context);
      const data = readTodos(testTopic);
      data.todos[0].dependencies = ["999"];
      writeTodos(testTopic, data);

      const validation = validateDependencies(data.todos, todo.id);
      expect(validation.valid).toBe(false);
      expect(validation.missing).toEqual(["999"]);
      expect(validation.incomplete).toEqual([]);
    });

    it("should throw error for non-existent todo in validation", () => {
      expect(() => validateDependencies([], "999")).toThrow(
        "Todo with ID 999 not found"
      );
    });
  });

  describe("backlog-todo-read tool", () => {
    it("should list all todos for a topic", async () => {
      // Create test todos
      const todo1 = createTodo("test-topic", "Todo 1", mockContext);
      const todo2 = createTodo("test-topic", "Todo 2", mockContext);

      const result = await backlogTodoRead.execute({ topic: "test-topic" }, mockContext);

      expect(result).toContain("| id | content | status | batch | dependencies |");
      expect(result).toContain(todo1.id);
      expect(result).toContain(todo2.id);
      expect(result).toContain("Todo 1");
      expect(result).toContain("Todo 2");
      expect(result).toContain("pending");
    });

    it("should filter todos by status", async () => {
      const todo1 = createTodo("test-topic", "Todo 1", mockContext);
      const todo2 = createTodo("test-topic", "Todo 2", mockContext);
      updateTodoStatus("test-topic", todo2.id, "completed");

      const result = await backlogTodoRead.execute({ topic: "test-topic", status: "completed" }, mockContext);

      expect(result).toContain("| id | content | status | batch | dependencies |");
      expect(result).toContain(todo2.id);
      expect(result).toContain("Todo 2");
      expect(result).toContain("completed");
    });

    it("should filter todos by batch", async () => {
      const todo1 = createTodo("test-topic", "Todo 1", mockContext);
      const todo2 = createTodo("test-topic", "Todo 2", mockContext);

      // Set batch on todo2
      const data = readTodos("test-topic");
      data.todos[1].batch = "batch-1";
      writeTodos("test-topic", data);

      const result = await backlogTodoRead.execute({ topic: "test-topic", batch: "batch-1" }, mockContext);

      expect(result).toContain("| id | content | status | batch | dependencies |");
      expect(result).toContain(todo2.id);
      expect(result).toContain("Todo 2");
      expect(result).toContain("pending");
      expect(result).toContain("batch-1");
    });

    it("should return message when no todos found", async () => {
      const result = await backlogTodoRead.execute({ topic: "empty-topic" }, mockContext);
      expect(result).toBe("No todos found for backlog: empty-topic");
    });
  });

  describe("backlog-todo-write tool", () => {
    it("should create a todo", async () => {
      const args = {
        action: "create",
        topic: "test-topic",
        content: "Test todo content"
      };

      const result = await backlogTodoWrite.execute(args, mockContext);
      const parsed = JSON.parse(result);

      expect(parsed.created.content).toBe("Test todo content");
      expect(parsed.created.status).toBe("pending");
      expect(parsed.created.batch).toBe(null);
      expect(parsed.created.dependencies).toEqual([]);
    });

    it("should create todo with batch and dependencies", async () => {
      const todo1 = createTodo("test-topic", "Dependency todo", mockContext);

      const args = {
        action: "create",
        topic: "test-topic",
        content: "Todo with deps",
        batch: "test-batch",
        dependencies: [todo1.id]
      };

      const result = await backlogTodoWrite.execute(args, mockContext);
      const parsed = JSON.parse(result);

      expect(parsed.created.content).toBe("Todo with deps");
      expect(parsed.created.batch).toBe("test-batch");
      expect(parsed.created.dependencies).toEqual([todo1.id]);
    });

    it("should update todo status", async () => {
      const todo = createTodo("test-topic", "Test todo", mockContext);

      const args = {
        action: "update",
        topic: "test-topic",
        todoId: todo.id,
        status: "in_progress"
      };

      const result = await backlogTodoWrite.execute(args, mockContext);
      const parsed = JSON.parse(result);

      expect(parsed.updated.id).toBe(todo.id);
      expect(parsed.updated.status).toBe("in_progress");
    });

    it("should update batch and dependencies", async () => {
      const todo = createTodo("test-topic", "Test todo", mockContext);
      const depTodo = createTodo("test-topic", "Dep todo", mockContext);

      const args = {
        action: "update",
        topic: "test-topic",
        todoId: todo.id,
        batch: "new-batch",
        dependencies: [depTodo.id]
      };

      const result = await backlogTodoWrite.execute(args, mockContext);
      const parsed = JSON.parse(result);

      expect(parsed.updated.batch).toBe("new-batch");
      expect(parsed.updated.dependencies).toEqual([depTodo.id]);
    });

    it("should throw error when content missing for create", async () => {
      const args = {
        action: "create",
        topic: "test-topic"
      };

      await expect(backlogTodoWrite.execute(args, mockContext)).rejects.toThrow(
        "content is required for create action"
      );
    });

    it("should throw error when todoId missing for update", async () => {
      const args = {
        action: "update",
        topic: "test-topic",
        status: "completed"
      };

      await expect(backlogTodoWrite.execute(args, mockContext)).rejects.toThrow(
        "todoId is required for update action"
      );
    });

    it("should throw error for non-existent todo in update", async () => {
      const args = {
        action: "update",
        topic: "test-topic",
        todoId: "999",
        status: "completed"
      };

      await expect(backlogTodoWrite.execute(args, mockContext)).rejects.toThrow(
        "Todo 999 not found in backlog: test-topic"
      );
    });

    it("should list todos", async () => {
      const todo = createTodo("test-topic", "Test todo", mockContext);

      const result = await backlogTodoWrite.execute({ action: "list", topic: "test-topic" }, mockContext);
      const parsed = JSON.parse(result);

      expect(parsed.backlogTopic).toBe("test-topic");
      expect(parsed.todos.length).toBe(1);
      expect(parsed.todos[0].id).toBe(todo.id);
    });
  });

  describe("backlog-todo-done tool", () => {
    it("should mark todo as complete", async () => {
      const todo = createTodo("test-topic", "Test todo", mockContext);

      const args = {
        action: "done",
        topic: "test-topic",
        todoId: todo.id
      };

      const result = await backlogTodoDone.execute(args, mockContext);
      const parsed = JSON.parse(result);

      expect(parsed.completed.id).toBe(todo.id);
      expect(parsed.completed.status).toBe("completed");
    });

    it("should mark todo complete when dependencies satisfied", async () => {
      const todo1 = createTodo("test-topic", "Dep todo", mockContext);
      const todo2 = createTodo("test-topic", "Main todo", mockContext);

      // Set dependency
      const data = readTodos("test-topic");
      data.todos[1].dependencies = [todo1.id];
      writeTodos("test-topic", data);

      // Complete dependency
      updateTodoStatus("test-topic", todo1.id, "completed");

      const args = {
        action: "done",
        topic: "test-topic",
        todoId: todo2.id
      };

      const result = await backlogTodoDone.execute(args, mockContext);
      const parsed = JSON.parse(result);

      expect(parsed.completed.status).toBe("completed");
    });

    it("should fail when dependencies incomplete", async () => {
      const todo1 = createTodo("test-topic", "Dep todo", mockContext);
      const todo2 = createTodo("test-topic", "Main todo", mockContext);

      // Set dependency
      const data = readTodos("test-topic");
      data.todos[1].dependencies = [todo1.id];
      writeTodos("test-topic", data);

      const args = {
        action: "done",
        topic: "test-topic",
        todoId: todo2.id
      };

      await expect(backlogTodoDone.execute(args, mockContext)).rejects.toThrow(
        `Cannot mark todo ${todo2.id} as complete. Incomplete dependencies: ${todo1.id}`
      );
    });

    it("should fail when dependencies missing", async () => {
      const todo = createTodo("test-topic", "Test todo", mockContext);

      // Set invalid dependency
      const data = readTodos("test-topic");
      data.todos[0].dependencies = ["999"];
      writeTodos("test-topic", data);

      const args = {
        action: "done",
        topic: "test-topic",
        todoId: todo.id
      };

      await expect(backlogTodoDone.execute(args, mockContext)).rejects.toThrow(
        `Cannot mark todo ${todo.id} as complete. Missing dependencies: 999`
      );
    });

    it("should throw error when todoId missing for done", async () => {
      const args = {
        action: "done",
        topic: "test-topic"
      };

      await expect(backlogTodoDone.execute(args, mockContext)).rejects.toThrow(
        "todoId is required for done action"
      );
    });

    it("should list todos", async () => {
      const todo = createTodo("test-topic", "Test todo", mockContext);

      const result = await backlogTodoDone.execute({ action: "list", topic: "test-topic" }, mockContext);
      const parsed = JSON.parse(result);

      expect(parsed.backlogTopic).toBe("test-topic");
      expect(parsed.todos.length).toBe(1);
      expect(parsed.todos[0].id).toBe(todo.id);
    });
  });
});