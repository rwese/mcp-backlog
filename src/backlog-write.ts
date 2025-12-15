import { tool } from "@opencode-ai/plugin";
import { renameSync } from 'fs';
import { readFile, writeFile, access } from 'fs/promises';
import { parseBacklogFile, listBacklogItems, getNextVersion, handleListBacklog, validateStatusTransition, generateBacklogFilename, createBacklogTemplate, amendBacklogTemplate, readBacklogFile, serializeFrontmatter, updateBacklogFrontmatter } from '../lib/backlog-shared';

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

async function handleCreate(args, context) {
  const { topic, description, priority = "medium" } = args;

  if (!topic || !description) {
    throw new Error("topic and description are required for create action");
  }

  const filename = generateBacklogFilename(topic);
  const dirpath = `.agent/Backlog/${filename}`;
  const filepath = `${dirpath}/item.md`;

   // Check for duplicate (both new and legacy structure)
   const newExists = await fileExists(filepath);
   const legacyPath = `.agent/Backlog/${filename}.md`;
   const legacyExists = await fileExists(legacyPath);
   
   if (newExists || legacyExists) {
     throw new Error(`Backlog item already exists. Use 'amend' to update it.`);
   }

   const content = createBacklogTemplate(topic, description, priority, context);

   // Create directory structure
   await writeFile(filepath, content);
  return `Created backlog item: ${filepath}`;
}

async function handleAmend(args, context) {
  const { topic, description, status, priority } = args;

  if (!topic) {
    throw new Error("topic is required for amend action");
  }

  const filename = generateBacklogFilename(topic);
  const dirpath = `.agent/Backlog/${filename}`;
  const filepath = `${dirpath}/item.md`;
  const legacyPath = `.agent/Backlog/${filename}.md`;

   // Check both new and legacy paths
   let actualPath = filepath;
   const newExists = await fileExists(filepath);
   const legacyExists = await fileExists(legacyPath);
   
   if (!newExists && !legacyExists) {
     throw new Error(`Backlog item not found: ${filepath}`);
   }
   
   if (legacyExists && !newExists) {
     actualPath = legacyPath;
   }

  // Parse current version
  const currentData = await parseBacklogFile(actualPath);

   // Use provided values or keep current values
   const newStatus = status || currentData.status;
   const newPriority = priority || currentData.priority;

   // Validate status transition if status is being changed
   if (status) {
     validateStatusTransition(currentData.status, newStatus);
   }

  const nextVersion = getNextVersion(filename);

   // Move current version to archive
   const archivePath = `.agent/COMPLETED_Backlog/${filename}-v${nextVersion}.md`;
   renameSync(actualPath, archivePath);

   // Create new version (always use new structure)
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



async function handleSubmit(args, context) {
   const { topic } = args;

   if (!topic) {
     throw new Error("topic is required for submit action");
   }

   const filename = generateBacklogFilename(topic);
   const filepath = `.agent/Backlog/${filename}/item.md`;
   const legacyPath = `.agent/Backlog/${filename}.md`;

   // Check both paths
   const newExists = await fileExists(filepath);
   const legacyExists = await fileExists(legacyPath);
   const actualPath = newExists ? filepath : (legacyExists ? legacyPath : null);
   
   if (!actualPath) {
     throw new Error(`Backlog item not found`);
   }

  // Parse current version
  const currentData = await parseBacklogFile(actualPath);

  // Validate current status is 'new'
  if (currentData.status !== 'new') {
    throw new Error(`Cannot submit item with status '${currentData.status}'. Item must be in 'new' status to submit.`);
  }

  // Use amend logic to transition to 'ready'
  return await handleAmend({ topic, status: 'ready' }, context);
}

async function handleApprove(args, context) {
   const { topic } = args;

   if (!topic) {
     throw new Error("topic is required for approve action");
   }

   const filename = generateBacklogFilename(topic);
   const filepath = `.agent/Backlog/${filename}/item.md`;
   const legacyPath = `.agent/Backlog/${filename}.md`;

   // Check both paths
   const newExists = await fileExists(filepath);
   const legacyExists = await fileExists(legacyPath);
   const actualPath = newExists ? filepath : (legacyExists ? legacyPath : null);
   
   if (!actualPath) {
     throw new Error(`Backlog item not found`);
   }

  // Parse current version
  const currentData = await parseBacklogFile(actualPath);

  // Validate current status is 'review'
  if (currentData.status !== 'review') {
    throw new Error(`Cannot approve item with status '${currentData.status}'. Item must be in 'review' status to approve.`);
  }

  // Use amend logic to transition to 'done'
  return await handleAmend({ topic, status: 'done' }, context);
}

async function handleReopen(args, context) {
   const { topic, description } = args;

   if (!topic) {
     throw new Error("topic is required for reopen action");
   }

   const filename = generateBacklogFilename(topic);
   const filepath = `.agent/Backlog/${filename}/item.md`;
   const legacyPath = `.agent/Backlog/${filename}.md`;

   // Check both paths
   const newExists = await fileExists(filepath);
   const legacyExists = await fileExists(legacyPath);
   const actualPath = newExists ? filepath : (legacyExists ? legacyPath : null);
   
   if (!actualPath) {
     throw new Error(`Backlog item not found`);
   }

  // Parse current version
  const currentData = await parseBacklogFile(actualPath);

  // Validate current status is 'review' or 'done'
  if (currentData.status !== 'review' && currentData.status !== 'done') {
    throw new Error(`Cannot reopen item with status '${currentData.status}'. Item must be in 'review' or 'done' status to reopen.`);
  }

  if (!description) {
    throw new Error("description (review notes) is required for reopen action");
  }

  // Use amend logic to transition to 'reopen' with review notes
  return await handleAmend({ topic, status: 'reopen', description }, context);
}

async function handleWontfix(args, context) {
   const { topic, description } = args;

   if (!topic) {
     throw new Error("topic is required for wontfix action");
   }

   const filename = generateBacklogFilename(topic);
   const filepath = `.agent/Backlog/${filename}/item.md`;
   const legacyPath = `.agent/Backlog/${filename}.md`;

   // Check both paths
   const newExists = await fileExists(filepath);
   const legacyExists = await fileExists(legacyPath);
   const actualPath = newExists ? filepath : (legacyExists ? legacyPath : null);
   
   if (!actualPath) {
     throw new Error(`Backlog item not found`);
   }

  // Parse current version
  const currentData = await parseBacklogFile(actualPath);

  // Allow wontfix from any non-terminal state
  if (currentData.status === 'done' || currentData.status === 'wontfix') {
    throw new Error(`Cannot mark item with status '${currentData.status}' as wontfix. Item is already in a terminal state.`);
  }

  // Use amend logic to transition to 'wontfix' with optional reason
  return await handleAmend({ topic, status: 'wontfix', description }, context);
}

export default tool({
  description: "Write access to backlog management - create, amend, and list backlog work items",
  args: {
    action: tool.schema
      .enum(["create", "list", "amend", "approve", "submit", "reopen", "wontfix"])
      .optional()
      .describe("Operation to perform (default: create)"),
    topic: tool.schema
      .string()
      .optional()
      .describe("Topic name (required for create/amend)"),
    description: tool.schema
      .string()
      .optional()
      .describe("Description (required for create, optional for amend)"),
    priority: tool.schema
      .enum(["high", "medium", "low"])
      .optional()
      .describe("Priority level for create/amend operations (default: medium)"),
    status: tool.schema
      .enum(["new", "ready", "review", "done", "reopen", "wontfix"])
      .optional()
      .describe("Status for amend operation or filter for list operation"),
  },

  async execute(args, context) {
    const action = args.action || "create";

    switch (action) {
      case "create":
        return await handleCreate(args, context);
      case "list":
        return await handleListBacklog(args);
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
});