import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { generateBacklogFilename } from './backlog-shared.js';

export interface Todo {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  batch: string | null;
  dependencies: string[];
  created: string;
  agent: string;
  session: string;
}

export interface TodoData {
  backlogTopic: string;
  todos: Todo[];
}

export interface Context {
  agent: string;
  sessionID: string;
}

export function getBacklogItemPath(topic: string): string {
  const normalized = generateBacklogFilename(topic);
  return `.agent/Backlog/${normalized}/item.md`;
}

export function getTodosFilePath(topic: string): string {
  const normalized = generateBacklogFilename(topic);
  return `.agent/Backlog/${normalized}/todos.json`;
}

export function ensureTodosDirectory(topic: string): void {
  const normalized = generateBacklogFilename(topic);
  const dirPath = `.agent/Backlog/${normalized}`;
  mkdirSync(dirPath, { recursive: true });
}

export function readTodos(topic: string): TodoData {
  const filePath = getTodosFilePath(topic);
  try {
    const content = readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    // File doesn't exist or is invalid, return empty structure
    return { backlogTopic: topic, todos: [] };
  }
}

export function writeTodos(topic: string, data: TodoData): void {
  ensureTodosDirectory(topic);
  const filePath = getTodosFilePath(topic);
  const json = JSON.stringify(data, null, 2);
  writeFileSync(filePath, json);
}

export function createTodo(topic: string, content: string, context: Context): Todo {
  const data = readTodos(topic);
  const existingIds = data.todos.map(t => parseInt(t.id)).filter(id => !isNaN(id));
  const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
  const id = nextId.toString();

  const todo: Todo = {
    id,
    content,
    status: "pending",
    batch: null,
    dependencies: [],
    created: new Date().toISOString(),
    agent: context.agent,
    session: context.sessionID
  };

  data.todos.push(todo);
  writeTodos(topic, data);
  return todo;
}

export function updateTodoStatus(topic: string, todoId: string, newStatus: string): Todo {
  const data = readTodos(topic);
  const todo = data.todos.find(t => t.id === todoId);
  if (!todo) {
    throw new Error(`Todo with ID ${todoId} not found in topic ${topic}`);
  }

  const validStatuses = ["pending", "in_progress", "completed", "cancelled"];
  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}. Must be one of: ${validStatuses.join(', ')}`);
  }

  todo.status = newStatus as Todo['status'];
  writeTodos(topic, data);
  return todo;
}

export function listTodos(topic: string, filters?: { status?: string, batch?: string }): Todo[] {
  const data = readTodos(topic);
  let todos = data.todos;

  if (filters?.status) {
    todos = todos.filter(t => t.status === filters.status);
  }

  if (filters?.batch) {
    todos = todos.filter(t => t.batch === filters.batch);
  }

  return todos;
}

export function validateDependencies(todos: Todo[], todoId: string): { valid: boolean, missing: string[], incomplete: string[] } {
  const todo = todos.find(t => t.id === todoId);
  if (!todo) {
    throw new Error(`Todo with ID ${todoId} not found`);
  }

  const missing: string[] = [];
  const incomplete: string[] = [];

  for (const depId of todo.dependencies) {
    const dep = todos.find(t => t.id === depId);
    if (!dep) {
      missing.push(depId);
    } else if (dep.status !== "completed") {
      incomplete.push(depId);
    }
  }

  return {
    valid: missing.length === 0 && incomplete.length === 0,
    missing,
    incomplete
  };
}