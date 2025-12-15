#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
   CallToolRequestSchema,
   ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { unlinkSync, rmSync, mkdirSync } from 'fs';
import { readFile, writeFile, access } from 'fs/promises';
import {
  handleListBacklog as listBacklogItems,
  parseBacklogFile,
  generateBacklogFilename,
  createBacklogTemplate,
  amendBacklogTemplate,
  getNextVersion,
  validateStatusTransition,
  getBacklogItem,
  formatBacklogAge,
  isBacklogStale
} from '../lib/backlog-shared.js';
import {
  readTodos,
  writeTodos,
  listTodos,
  validateDependencies
} from '../lib/backlog-todo-shared.js';
import { getBacklogDir, getCompletedBacklogDir } from '../lib/path-resolver.js';

/**
 * Check if a file exists using fs/promises
 * @param path Path to the file
 * @returns True if file exists
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

// Context for tool execution
function createContext() {
  return {
    agent: "mcp-backlog",
    sessionID: crypto.randomUUID(),
  };
}

// Backlog Read Handler
async function handleBacklogRead(args: any) {
  const { topic, showAge = true } = args;
  
  // If topic is provided, fetch single item
  if (topic) {
    const item = await getBacklogItem(topic);
    
    if (!item) {
      return `Backlog item not found: ${topic}`;
    }
    
    // Return full item details including description
    const result: any = {
      topic: item.topic,
      priority: item.priority,
      status: item.status,
      version: item.version,
      created: item.created,
      agent: item.agent,
      session: item.session,
      description: item.description,
      filepath: item.filepath
    };
    
    if (showAge) {
      result.age = formatBacklogAge(item.created);
      result.isStale = isBacklogStale(item.created);
    }
    
    return JSON.stringify(result, null, 2);
  }
  
  // Otherwise, list items
  return await listBacklogItems(args);
}

// Backlog Write Handler
async function handleBacklogWrite(args: any, context: any) {
  const action = args.action || "create";

  switch (action) {
    case "create":
      return await handleCreate(args, context);
    case "list":
      return await listBacklogItems(args);
    case "amend":
      return await handleAmend(args, context);
    case "submit":
      return await handleSubmit(args, context);
    case "approve":
      return await handleApprove(args, context);
    case "reopen":
      return await handleReopen(args, context);
    case "wontfix":
      return await handleWontfix(args, context);
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

async function handleCreate(args: any, context: any) {
  const { topic, description, priority = "medium" } = args;

  if (!topic || !description) {
    throw new Error("topic and description are required for create action");
  }

  const filename = generateBacklogFilename(topic);
  const backlogDir = getBacklogDir();
  const dirpath = `${backlogDir}/${filename}`;
  const filepath = `${dirpath}/item.md`;

   const newExists = await fileExists(filepath);
   const legacyPath = `${backlogDir}/${filename}.md`;
   const legacyExists = await fileExists(legacyPath);
   
   if (newExists || legacyExists) {
     throw new Error(`Backlog item already exists. Use 'amend' to update it.`);
   }

   const content = createBacklogTemplate(topic, description, priority, context);
   mkdirSync(dirpath, { recursive: true });
   await writeFile(filepath, content);
  return `Created backlog item: ${filepath}`;
}

async function handleAmend(args: any, context: any) {
  const { topic, description, status, priority } = args;

  if (!topic) {
    throw new Error("topic is required for amend action");
  }

  const filename = generateBacklogFilename(topic);
  const backlogDir = getBacklogDir();
  const dirpath = `${backlogDir}/${filename}`;
  const filepath = `${dirpath}/item.md`;
  const legacyPath = `${backlogDir}/${filename}.md`;

   let actualPath = filepath;
   const newExists = await fileExists(filepath);
   const legacyExists = await fileExists(legacyPath);
   
   if (!newExists && !legacyExists) {
     throw new Error(`Backlog item not found: ${filepath}`);
   }
   
   if (legacyExists && !newExists) {
     actualPath = legacyPath;
   }

   const currentData = await parseBacklogFile(actualPath);
   const newStatus = status || currentData.status;
   const newPriority = priority || currentData.priority;

   if (status) {
     validateStatusTransition(currentData.status, newStatus);
   }

   const nextVersion = getNextVersion(filename);
   const completedDir = getCompletedBacklogDir();
   const archivePath = `${completedDir}/${filename}-v${nextVersion}.md`;
   
   const { renameSync } = await import('fs');
   renameSync(actualPath, archivePath);

   const newContent = amendBacklogTemplate(
     topic,
     description || '(No updated description provided)',
     newPriority,
     newStatus,
     nextVersion + 1,
     currentData.created,
     currentData.agent || 'unknown',
     currentData.session || 'unknown',
     context
   );

   await writeFile(filepath, newContent);

  const updates = [];
  if (status) updates.push(`status=${status}`);
  if (priority) updates.push(`priority=${priority}`);
  if (description) updates.push('description');
  const updateInfo = updates.length > 0 ? ` (updated: ${updates.join(', ')})` : '';
  return `Amended backlog item: ${filepath}${updateInfo} (archived v${nextVersion} to ${archivePath})`;
}

async function handleSubmit(args: any, context: any) {
  const { topic } = args;
  if (!topic) throw new Error("topic is required for submit action");

   const filename = generateBacklogFilename(topic);
   const backlogDir = getBacklogDir();
   const filepath = `${backlogDir}/${filename}/item.md`;
   const legacyPath = `${backlogDir}/${filename}.md`;

   const newExists = await fileExists(filepath);
   const legacyExists = await fileExists(legacyPath);
   const actualPath = newExists ? filepath : (legacyExists ? legacyPath : null);
   
   if (!actualPath) throw new Error(`Backlog item not found`);

   const currentData = await parseBacklogFile(actualPath);
   if (currentData.status !== 'new') {
     throw new Error(`Cannot submit item with status '${currentData.status}'. Item must be in 'new' status to submit.`);
   }

   return await handleAmend({ topic, status: 'ready' }, context);
}

async function handleApprove(args: any, context: any) {
  const { topic } = args;
  if (!topic) throw new Error("topic is required for approve action");

   const filename = generateBacklogFilename(topic);
   const backlogDir = getBacklogDir();
   const filepath = `${backlogDir}/${filename}/item.md`;
   const legacyPath = `${backlogDir}/${filename}.md`;

   const newExists = await fileExists(filepath);
   const legacyExists = await fileExists(legacyPath);
   const actualPath = newExists ? filepath : (legacyExists ? legacyPath : null);
   
   if (!actualPath) throw new Error(`Backlog item not found`);

   const currentData = await parseBacklogFile(actualPath);
   if (currentData.status !== 'review') {
     throw new Error(`Cannot approve item with status '${currentData.status}'. Item must be in 'review' status to approve.`);
   }

   return await handleAmend({ topic, status: 'done' }, context);
}

async function handleReopen(args: any, context: any) {
  const { topic, description } = args;
  if (!topic) throw new Error("topic is required for reopen action");

   const filename = generateBacklogFilename(topic);
   const backlogDir = getBacklogDir();
   const filepath = `${backlogDir}/${filename}/item.md`;
   const legacyPath = `${backlogDir}/${filename}.md`;

   const newExists = await fileExists(filepath);
   const legacyExists = await fileExists(legacyPath);
   const actualPath = newExists ? filepath : (legacyExists ? legacyPath : null);
   
   if (!actualPath) throw new Error(`Backlog item not found`);

   const currentData = await parseBacklogFile(actualPath);
   if (currentData.status !== 'review' && currentData.status !== 'done') {
     throw new Error(`Cannot reopen item with status '${currentData.status}'. Item must be in 'review' or 'done' status to reopen.`);
   }

   if (!description) {
     throw new Error("description (review notes) is required for reopen action");
   }

   return await handleAmend({ topic, status: 'reopen', description }, context);
}

async function handleWontfix(args: any, context: any) {
  const { topic, description } = args;
  if (!topic) throw new Error("topic is required for wontfix action");

   const filename = generateBacklogFilename(topic);
   const backlogDir = getBacklogDir();
   const filepath = `${backlogDir}/${filename}/item.md`;
   const legacyPath = `${backlogDir}/${filename}.md`;

   const newExists = await fileExists(filepath);
   const legacyExists = await fileExists(legacyPath);
   const actualPath = newExists ? filepath : (legacyExists ? legacyPath : null);
   
   if (!actualPath) throw new Error(`Backlog item not found`);

   const currentData = await parseBacklogFile(actualPath);
   if (currentData.status === 'done' || currentData.status === 'wontfix') {
     throw new Error(`Cannot mark item with status '${currentData.status}' as wontfix. Item is already in a terminal state.`);
   }

   return await handleAmend({ topic, status: 'wontfix', description }, context);
}

// Backlog Done Handler
async function handleBacklogDone(args: any, context: any) {
  const action = args.action || "done";

  switch (action) {
    case "done":
      return await handleDone(args, context);
    case "list":
      return await listBacklogItems(args);
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

async function handleDone(args: any, context: any) {
  const { topic, summary } = args;

  if (!topic) {
    throw new Error("topic is required for done action");
  }

  const filename = topic
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  const backlogDir = getBacklogDir();
  const filepath = `${backlogDir}/${filename}/item.md`;
  const legacyPath = `${backlogDir}/${filename}.md`;

   let actualPath: string | null = null;
   const newExists = await fileExists(filepath);
   const legacyExists = await fileExists(legacyPath);
   
   if (newExists) {
     actualPath = filepath;
   } else if (legacyExists) {
     actualPath = legacyPath;
   } else {
     throw new Error(`Backlog item not found for topic: ${topic}`);
   }

   let content = await readFile(actualPath, 'utf8');
  
  let finalStatus = 'done';
  if (content.startsWith('---\n')) {
    const statusMatch = content.match(/status: (wontfix|done)/);
    if (statusMatch) {
      finalStatus = statusMatch[1];
    }
  }

  if (content.startsWith('---\n')) {
    content = content.replace(/status: .*/, `status: ${finalStatus}`);
  } else {
    content = content.replace(/## Status: .*/, `## Status: ${finalStatus}`);
  }

  const timestamp = new Date().toISOString();
  let completionSection = `\n## Completed\n- Date: ${timestamp}\n- Agent: ${context.agent}\n- Session: ${context.sessionID}\n`;
  
  if (summary) {
    completionSection += `\n### Summary\n\n${summary}\n`;
  }

  content = content.replace(/\n---\n/, `${completionSection}\n---\n`);

   const prefix = finalStatus === 'wontfix' ? 'WONTFIX' : 'DONE';
   const completedDir = getCompletedBacklogDir();
   const completedPath = `${completedDir}/${prefix}_${filename}.md`;
   await writeFile(completedPath, content, 'utf8');

  if (actualPath === filepath) {
    const dirpath = `${backlogDir}/${filename}`;
    rmSync(dirpath, { recursive: true, force: true });
  } else {
    unlinkSync(actualPath);
  }

  return `Marked backlog item as ${finalStatus}: ${completedPath}${summary ? ' (with summary)' : ''}`;
}

// Backlog Todo Read Handler
async function handleBacklogTodoRead(args: any) {
  const { topic, status, batch } = args;
  if (!topic) throw new Error("topic is required");

  const filters: any = {};
  if (status) filters.status = status;
  if (batch) filters.batch = batch;

  const todos = listTodos(topic, filters);
  return JSON.stringify(todos, null, 2);
}

// Backlog Todo Write Handler
async function handleBacklogTodoWrite(args: any) {
  const { action, topic, todoId, content, status, dependencies, batch } = args;
  if (!topic) throw new Error("topic is required");

  switch (action) {
    case "create": {
      if (!content) throw new Error("content is required for create action");
      
      const data = readTodos(topic);
      const newTodo = {
        id: crypto.randomUUID(),
        content,
        status: status || "pending",
        dependencies: dependencies || [],
        batch: batch || null,
        created: new Date().toISOString(),
        agent: "mcp-backlog",
        session: crypto.randomUUID(),
      };
      
      data.todos.push(newTodo);
      writeTodos(topic, data);
      return `Created todo: ${newTodo.id}`;
    }

    case "update": {
      if (!todoId) throw new Error("todoId is required for update action");
      
      const data = readTodos(topic);
      const todo = data.todos.find(t => t.id === todoId);
      if (!todo) throw new Error(`Todo not found: ${todoId}`);
      
      if (content !== undefined) todo.content = content;
      if (status !== undefined) todo.status = status as any;
      if (dependencies !== undefined) todo.dependencies = dependencies;
      if (batch !== undefined) todo.batch = batch;
      
      writeTodos(topic, data);
      return `Updated todo: ${todoId}`;
    }

    case "list": {
      return await handleBacklogTodoRead({ topic, status, batch });
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

// Backlog Todo Done Handler
async function handleBacklogTodoDone(args: any) {
  const { action, topic, todoId, status, batch } = args;
  if (!topic) throw new Error("topic is required");

  switch (action) {
    case "done": {
      if (!todoId) throw new Error("todoId is required for done action");
      
      const data = readTodos(topic);
      if (data.todos.length === 0) throw new Error("No todos found for this backlog item");
      
      const todo = data.todos.find((t: any) => t.id === todoId);
      if (!todo) throw new Error(`Todo not found: ${todoId}`);
      
      // Validate dependencies
      const validation = validateDependencies(data.todos, todoId);
      if (!validation.valid) {
        const errors = [];
        if (validation.missing.length > 0) {
          errors.push(`Missing dependencies: ${validation.missing.join(', ')}`);
        }
        if (validation.incomplete.length > 0) {
          errors.push(`Incomplete dependencies: ${validation.incomplete.join(', ')}`);
        }
        throw new Error(errors.join('; '));
      }
      
      todo.status = "completed";
      (todo as any).completedAt = new Date().toISOString();
      
      writeTodos(topic, data);
      return `Marked todo as done: ${todoId}`;
    }

    case "list": {
      return await handleBacklogTodoRead({ topic, status, batch });
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

async function main() {
  const server = new Server(
    {
      name: "mcp-backlog",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Tool definitions
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "backlog-read",
          description: "Read-only access to backlog items - list and view backlog work items",
          inputSchema: {
            type: "object",
            properties: {
              topic: {
                type: "string",
                description: "Topic name to fetch a single backlog item with full content",
              },
              status: {
                type: "string",
                enum: ["new", "ready", "review", "done", "reopen", "wontfix"],
                description: "Status filter for list operation",
              },
              priority: {
                type: "string",
                enum: ["high", "medium", "low"],
                description: "Priority filter for list operation",
              },
              showAge: {
                type: "boolean",
                description: "Include age information (default: true)",
              },
            },
          },
        },
        {
          name: "backlog-write",
          description: "Write access to backlog management - create, amend, and list backlog work items",
          inputSchema: {
            type: "object",
            properties: {
              action: {
                type: "string",
                enum: ["create", "list", "amend", "approve", "submit", "reopen", "wontfix"],
                description: "Operation to perform (default: create)",
              },
              topic: {
                type: "string",
                description: "Topic name (required for create/amend)",
              },
              description: {
                type: "string",
                description: "Description (required for create, optional for amend)",
              },
              priority: {
                type: "string",
                enum: ["high", "medium", "low"],
                description: "Priority level for create/amend operations (default: medium)",
              },
              status: {
                type: "string",
                enum: ["new", "ready", "review", "done", "reopen", "wontfix"],
                description: "Status for amend operation or filter for list operation",
              },
            },
          },
        },
        {
          name: "backlog-done",
          description: "Mark backlog items as complete with optional summary - done operation and list",
          inputSchema: {
            type: "object",
            properties: {
              action: {
                type: "string",
                enum: ["done", "list"],
                description: "Operation to perform (default: done)",
              },
              topic: {
                type: "string",
                description: "Topic name (required for done)",
              },
              summary: {
                type: "string",
                description: "Optional completion summary describing what was accomplished, lessons learned, or final notes",
              },
              status: {
                type: "string",
                enum: ["new", "ready", "review", "done", "reopen", "wontfix"],
                description: "Status filter for list operation",
              },
              priority: {
                type: "string",
                enum: ["high", "medium", "low"],
                description: "Priority filter for list operation",
              },
            },
          },
        },
        {
          name: "backlog-todo-read",
          description: "Read-only access to backlog todos - list and filter todos for a backlog item",
          inputSchema: {
            type: "object",
            properties: {
              topic: {
                type: "string",
                description: "Topic name (required)",
              },
              status: {
                type: "string",
                enum: ["pending", "in_progress", "completed", "cancelled"],
                description: "Filter by status",
              },
              batch: {
                type: "string",
                description: "Filter by batch",
              },
            },
            required: ["topic"],
          },
        },
        {
          name: "backlog-todo-write",
          description: "Write access to backlog todos - create and update todos for backlog items",
          inputSchema: {
            type: "object",
            properties: {
              action: {
                type: "string",
                enum: ["create", "update", "list"],
                description: "Operation to perform",
              },
              topic: {
                type: "string",
                description: "Topic name (required)",
              },
              todoId: {
                type: "string",
                description: "Todo ID (required for update)",
              },
              content: {
                type: "string",
                description: "Todo content",
              },
              status: {
                type: "string",
                enum: ["pending", "in_progress", "completed", "cancelled"],
                description: "Todo status",
              },
              dependencies: {
                type: "array",
                items: { type: "string" },
                description: "Todo dependencies (array of todo IDs)",
              },
              batch: {
                type: "string",
                description: "Batch identifier",
              },
            },
            required: ["action", "topic"],
          },
        },
        {
          name: "backlog-todo-done",
          description: "Mark backlog todos as complete with dependency validation",
          inputSchema: {
            type: "object",
            properties: {
              action: {
                type: "string",
                enum: ["done", "list"],
                description: "Operation to perform",
              },
              topic: {
                type: "string",
                description: "Topic name (required)",
              },
              todoId: {
                type: "string",
                description: "Todo ID (required for done)",
              },
              status: {
                type: "string",
                enum: ["pending", "in_progress", "completed", "cancelled"],
                description: "Filter by status (for list)",
              },
              batch: {
                type: "string",
                description: "Filter by batch (for list)",
              },
            },
            required: ["action", "topic"],
          },
        },
      ],
    };
  });

  // Tool execution handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const context = createContext();
    
    try {
      let result: any;
      
      switch (request.params.name) {
        case "backlog-read":
          result = await handleBacklogRead(request.params.arguments);
          break;
        case "backlog-write":
          result = await handleBacklogWrite(request.params.arguments, context);
          break;
        case "backlog-done":
          result = await handleBacklogDone(request.params.arguments, context);
          break;
        case "backlog-todo-read":
          result = await handleBacklogTodoRead(request.params.arguments);
          break;
        case "backlog-todo-write":
          result = await handleBacklogTodoWrite(request.params.arguments);
          break;
        case "backlog-todo-done":
          result = await handleBacklogTodoDone(request.params.arguments);
          break;
        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }
      
      return {
        content: [
          {
            type: "text",
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Backlog server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
