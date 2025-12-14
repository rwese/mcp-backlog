import { tool } from "@opencode-ai/plugin";
import { unlinkSync, rmSync } from 'fs';
import { readFile, writeFile, access } from 'fs/promises';
import { handleListBacklog } from '../lib/backlog-shared.js';

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

async function handleDone(args, context) {
  const { topic, summary } = args;

  if (!topic) {
    throw new Error("topic is required for done action");
  }

  const filename = topic
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  const filepath = `.agent/Backlog/${filename}/item.md`;
  const legacyPath = `.agent/Backlog/${filename}.md`;

   // Check both new and legacy paths
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

   // Read and update content
   let content = await readFile(actualPath, 'utf8');
  
  // Determine final status from frontmatter if present
  let finalStatus = 'done';
  if (content.startsWith('---\n')) {
    const statusMatch = content.match(/status: (wontfix|done)/);
    if (statusMatch) {
      finalStatus = statusMatch[1];
    }
  }

  // Check if it has frontmatter
  if (content.startsWith('---\n')) {
    // Update status in frontmatter
    content = content.replace(/status: .*/, `status: ${finalStatus}`);
  } else {
    // Fallback to old format
    content = content.replace(/## Status: .*/, `## Status: ${finalStatus}`);
  }

  // Add completion metadata
  const timestamp = new Date().toISOString();
  let completionSection = `\n## Completed\n- Date: ${timestamp}\n- Agent: ${context.agent}\n- Session: ${context.sessionID}\n`;
  
  // Add summary if provided
  if (summary) {
    completionSection += `\n### Summary\n\n${summary}\n`;
  }

  // Insert before workflow section
  content = content.replace(/\n---\n/, `${completionSection}\n---\n`);

   // Write to COMPLETED_Backlog with appropriate prefix
   const prefix = finalStatus === 'wontfix' ? 'WONTFIX' : 'DONE';
   const completedPath = `.agent/COMPLETED_Backlog/${prefix}_${filename}.md`;
   await writeFile(completedPath, content);

  // Remove from Backlog - remove entire directory if using new structure, just file if legacy
  if (actualPath === filepath) {
    // New structure: remove entire directory
    const dirpath = `.agent/Backlog/${filename}`;
    rmSync(dirpath, { recursive: true, force: true });
  } else {
    // Legacy structure: remove just the file
    unlinkSync(actualPath);
  }

  return `Marked backlog item as ${finalStatus}: ${completedPath}${summary ? ' (with summary)' : ''}`;
}



export default tool({
  description: "Mark backlog items as complete with optional summary - done operation and list",
  args: {
    action: tool.schema
      .enum(["done", "list"])
      .optional()
      .describe("Operation to perform (default: done)"),
    topic: tool.schema
      .string()
      .optional()
      .describe("Topic name (required for done)"),
    summary: tool.schema
      .string()
      .optional()
      .describe("Optional completion summary describing what was accomplished, lessons learned, or final notes"),
    status: tool.schema
      .enum(["new", "ready", "review", "done", "reopen", "wontfix"])
      .optional()
      .describe("Status filter for list operation"),
    priority: tool.schema
      .enum(["high", "medium", "low"])
      .optional()
      .describe("Priority filter for list operation"),
  },

  async execute(args, context) {
    const action = args.action || "done";

    switch (action) {
      case "done":
        return await handleDone(args, context);
      case "list":
        return await handleListBacklog(args);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }
});