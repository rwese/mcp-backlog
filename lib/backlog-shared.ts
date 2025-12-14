import { readdirSync } from 'fs';
import { getBacklogDir, getCompletedBacklogDir } from './path-resolver.js';

/**
 * Parse YAML frontmatter from markdown content
 * @param content Markdown file content
 * @returns { frontmatter: object, body: string } or null if no frontmatter
 */
export function parseFrontmatter(content: string): { frontmatter: Record<string, any>, body: string } | null {
  // Check for frontmatter delimiters
  if (!content.startsWith('---\n')) {
    return null;
  }

  const lines = content.split('\n');
  let endIndex = -1;

  // Find closing ---
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    return null;
  }

  // Parse YAML (simple key: value format)
  const frontmatter: Record<string, any> = {};
  for (let i = 1; i < endIndex; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.substring(0, colonIndex).trim();
    let value = line.substring(colonIndex + 1).trim();

    // Remove quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

     // Parse numbers and booleans
     if (!isNaN(Number(value)) && value !== '') {
       frontmatter[key] = Number(value);
     } else if (value === 'true') {
       frontmatter[key] = true;
     } else if (value === 'false') {
       frontmatter[key] = false;
     } else {
       frontmatter[key] = value;
     }
  }

  // Body is everything after closing ---
  const body = lines.slice(endIndex + 1).join('\n');

  return { frontmatter, body };
}

/**
 * Serialize frontmatter and body back to markdown
 * @param frontmatter Frontmatter object
 * @param body Markdown body
 * @returns Serialized markdown content
 */
export function serializeFrontmatter(frontmatter: Record<string, any>, body: string): string {
  const lines = ['---'];

  for (const [key, value] of Object.entries(frontmatter)) {
    if (value === null || value === undefined) continue;
    const serialized = serializeValue(key, value);
    lines.push(serialized);
  }

  lines.push('---');
  lines.push(body);

  return lines.join('\n');
}

/**
 * Serialize a single key-value pair for frontmatter
 * @param key Property key
 * @param value Property value
 * @returns Serialized line
 */
function serializeValue(key: string, value: any): string {
  if (typeof value === 'string' && (value.includes(' ') || value.includes(':'))) {
    return `${key}: "${value}"`;
  }
  return `${key}: ${value}`;
}

/**
 * Update frontmatter properties in a file
 * @param filepath Path to the markdown file
 * @param updates Properties to update
 */
export async function updateBacklogFrontmatter(filepath: string, updates: Record<string, any>): Promise<void> {
  const content = await Bun.file(filepath).text();
  const parsed = parseFrontmatter(content);

  if (!parsed) {
    throw new Error('File does not have frontmatter');
  }

  // Merge updates
  Object.assign(parsed.frontmatter, updates);

  // Serialize and write
  const newContent = serializeFrontmatter(parsed.frontmatter, parsed.body);
  await Bun.write(filepath, newContent);
}

/**
 * Read backlog file with parsed frontmatter
 * @param filepath Path to the markdown file
 * @returns Parsed frontmatter, body, and format
 */
export async function readBacklogFile(filepath: string): Promise<{
  frontmatter: Record<string, any>;
  body: string;
  format: 'frontmatter' | 'legacy';
}> {
  const content = await Bun.file(filepath).text();
  const parsed = parseFrontmatter(content);

  if (parsed) {
    return {
      frontmatter: parsed.frontmatter,
      body: parsed.body,
      format: 'frontmatter'
    };
  }

  // Legacy format - extract metadata
  const frontmatter = await parseLegacyMetadata(content);
  return {
    frontmatter,
    body: content,
    format: 'legacy'
  };
}

/**
 * Parse metadata from legacy markdown format
 * @param content Markdown content
 * @returns Frontmatter object
 */
async function parseLegacyMetadata(content: string): Promise<Record<string, any>> {
  const lines = content.split('\n');
  const frontmatter: Record<string, any> = {
    topic: '',
    priority: 'medium',
    status: 'new',
    version: 1,
    created: '',
    agent: '',
    session: ''
  };

  for (const line of lines) {
    if (line.startsWith('# Backlog: ')) {
      frontmatter.topic = line.replace('# Backlog: ', '').trim();
    } else if (line.startsWith('## Priority: ')) {
      frontmatter.priority = line.replace('## Priority: ', '').trim();
    } else if (line.startsWith('## Status: ')) {
      frontmatter.status = line.replace('## Status: ', '').trim();
    } else if (line.startsWith('## Version: ')) {
      frontmatter.version = parseInt(line.replace('## Version: ', '').trim());
    } else if (line.startsWith('- Date: ')) {
      frontmatter.created = line.replace('- Date: ', '').trim();
    } else if (line.startsWith('- Agent: ')) {
      frontmatter.agent = line.replace('- Agent: ', '').trim();
    } else if (line.startsWith('- Session: ')) {
      frontmatter.session = line.replace('- Session: ', '').trim();
    }
  }

  return frontmatter;
}

/**
 * Parse a backlog markdown file and extract metadata
 * @param filepath Path to the backlog markdown file
 * @returns Parsed backlog item metadata
 */
export async function parseBacklogFile(filepath: string) {
  const content = await Bun.file(filepath).text();

  // Try parsing frontmatter first
  const parsed = parseFrontmatter(content);

  if (parsed) {
    // New format with frontmatter
    return {
      topic: parsed.frontmatter.topic || '',
      priority: parsed.frontmatter.priority || 'medium',
      status: parsed.frontmatter.status || 'new',
      version: parsed.frontmatter.version || 1,
      created: parsed.frontmatter.created || '',
      agent: parsed.frontmatter.agent || '',
      session: parsed.frontmatter.session || '',
      filepath: filepath
    };
  }

  // Fallback to old format (existing parsing logic)
  const lines = content.split('\n');
  const data = {
    topic: '',
    priority: 'medium',
    status: 'new',
    version: 1,
    created: '',
    agent: '',
    session: '',
    filepath: filepath
  };

  for (const line of lines) {
    if (line.startsWith('# Backlog: ')) {
      data.topic = line.replace('# Backlog: ', '').trim();
    } else if (line.startsWith('## Priority: ')) {
      data.priority = line.replace('## Priority: ', '').trim();
    } else if (line.startsWith('## Status: ')) {
      data.status = line.replace('## Status: ', '').trim();
    } else if (line.startsWith('## Version: ')) {
      data.version = parseInt(line.replace('## Version: ', '').trim());
    } else if (line.startsWith('- Date: ')) {
      data.created = line.replace('- Date: ', '').trim();
    } else if (line.startsWith('- Agent: ')) {
      data.agent = line.replace('- Agent: ', '').trim();
    } else if (line.startsWith('- Session: ')) {
      data.session = line.replace('- Session: ', '').trim();
    }
  }

  return data;
}

/**
 * List all backlog items from both active and completed directories
 * @param statusFilter Optional status filter
 * @param priorityFilter Optional priority filter
 * @returns Array of backlog items
 */
export async function listBacklogItems(statusFilter?: string, priorityFilter?: string) {
  const items = [];
  const dirs = [
    { path: getBacklogDir(), isSubdir: true },
    { path: getCompletedBacklogDir(), isSubdir: false }
  ];

  for (const dir of dirs) {
    try {
      const entries = readdirSync(dir.path);

      for (const entry of entries) {
        let filepath: string;
        
        if (dir.isSubdir) {
          // New structure: .agent/Backlog/<topic>/item.md
          const itemPath = `${dir.path}/${entry}/item.md`;
          const itemExists = await Bun.file(itemPath).exists();
          if (itemExists) {
            filepath = itemPath;
          } else {
            // Legacy structure: .agent/Backlog/<topic>.md
            if (entry.endsWith('.md')) {
              filepath = `${dir.path}/${entry}`;
            } else {
              continue;
            }
          }
        } else {
          // Completed items are always flat .md files
          if (!entry.endsWith('.md')) continue;
          filepath = `${dir.path}/${entry}`;
        }

        const data = await parseBacklogFile(filepath);

        // Apply filters
        if (statusFilter && data.status !== statusFilter) continue;
        if (priorityFilter && data.priority !== priorityFilter) continue;

        items.push(data);
      }
    } catch (e) {
      // Directory doesn't exist or is empty
    }
  }

  return items;
}

/**
 * Get the next version number for a backlog item
 * @param filename Base filename without extension
 * @returns Next version number
 */
export function getNextVersion(filename: string): number {
  try {
    const files = readdirSync(getCompletedBacklogDir());
    const versions = files
      .filter(f => f.startsWith(filename + '-v') && f.endsWith('.md'))
      .map(f => {
        const match = f.match(/-v(\d+)\.md$/);
        return match ? parseInt(match[1]) : 0;
      });

    return versions.length > 0 ? Math.max(...versions) + 1 : 1;
  } catch (e) {
    return 1;
  }
}

/**
 * Handle listing backlog items with optional filters
 */
export async function handleListBacklog(args: { status?: string; priority?: string }) {
  const { status, priority } = args;
  const items = await listBacklogItems(status, priority);

  if (items.length === 0) {
    return "No backlog items found";
  }

  return JSON.stringify(items, null, 2);
}

/**
 * Valid status transitions for backlog items
 */
const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  new: ['ready', 'done', 'wontfix'], // allow cancelling from new
  ready: ['review', 'new', 'wontfix'], // allow back to new for edits or cancel
  review: ['done', 'reopen', 'wontfix'], // approve, reject, or cancel
  done: [], // terminal state
  reopen: ['review', 'wontfix'], // resubmit for review or cancel
  wontfix: [] // terminal state
};

/**
 * Validate if a status transition is allowed
 * @param currentStatus Current status of the backlog item
 * @param newStatus Proposed new status
 * @throws Error if transition is invalid
 */
export function validateStatusTransition(currentStatus: string, newStatus: string): void {
  // Allow staying in the same status
  if (currentStatus === newStatus) {
    return;
  }

  const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(newStatus)) {
    throw new Error(`Invalid status transition from '${currentStatus}' to '${newStatus}'. Allowed transitions from '${currentStatus}': ${allowed ? allowed.join(', ') : 'none'}`);
  }
}

/**
 * Generate a normalized filename from a topic
 * @param topic Topic name
 * @returns Normalized filename (without extension)
 */
export function generateBacklogFilename(topic: string): string {
  return topic
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/**
 * Create a new backlog item template
 * @param topic Topic name
 * @param description Description text
 * @param priority Priority level (default: medium)
 * @param context Execution context with agent and sessionID
 * @returns Formatted backlog markdown content
 */
export function createBacklogTemplate(
  topic: string,
  description: string,
  priority: string,
  context: { agent: string; sessionID: string }
): string {
  const timestamp = new Date().toISOString();

  return `---
topic: "${topic}"
priority: ${priority}
status: new
version: 1
created: ${timestamp}
agent: ${context.agent}
session: ${context.sessionID}
---

# Backlog: ${topic}

## Description

${description}

---

## Workflow

1. New Work: Use **backlog-write** tool to create backlog items
2. Completion: Use **backlog-done** tool to mark complete
3. Reference: Use **backlog-read** tool to check completed items for examples
`;
}

/**
 * Create an amended backlog item template
 * @param topic Topic name
 * @param description Description text
 * @param priority Priority level
 * @param status Status value
 * @param version Version number
 * @param originalCreated Original creation timestamp
 * @param originalAgent Original agent
 * @param originalSession Original session
 * @param context Execution context with agent and sessionID
 * @returns Formatted backlog markdown content
 */
export function amendBacklogTemplate(
  topic: string,
  description: string,
  priority: string,
  status: string,
  version: number,
  originalCreated: string,
  originalAgent: string,
  originalSession: string,
  context: { agent: string; sessionID: string }
): string {
  const timestamp = new Date().toISOString();

  return `---
topic: "${topic}"
priority: ${priority}
status: ${status}
version: ${version}
created: ${originalCreated}
agent: ${originalAgent}
session: ${originalSession}
amended: ${timestamp}
amendedBy: ${context.agent}
amendedSession: ${context.sessionID}
---

# Backlog: ${topic}

## Description

${description}

---

## Workflow

1. New Work: Use **backlog-write** tool to create backlog items
2. Completion: Use **backlog-done** tool to mark complete
3. Reference: Use **backlog-read** tool to check completed items for examples
`;
}
/**
 * Calculate age of a backlog item in days
 * @param createdTimestamp ISO timestamp string
 * @returns Age in days
 */
export function calculateBacklogAge(createdTimestamp: string): number {
  if (!createdTimestamp) return 0;
  
  const created = new Date(createdTimestamp);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Check if a backlog item is stale
 * @param createdTimestamp ISO timestamp string
 * @param staleDays Number of days to consider stale (default: 30)
 * @returns True if stale
 */
export function isBacklogStale(createdTimestamp: string, staleDays: number = 30): boolean {
  const age = calculateBacklogAge(createdTimestamp);
  return age >= staleDays;
}

/**
 * Format backlog age as human-readable string
 * @param createdTimestamp ISO timestamp string
 * @returns Human-readable age (e.g., "5 days ago", "2 months ago")
 */
export function formatBacklogAge(createdTimestamp: string): string {
  const age = calculateBacklogAge(createdTimestamp);
  
  if (age === 0) return "today";
  if (age === 1) return "1 day ago";
  if (age < 7) return `${age} days ago`;
  if (age < 30) {
    const weeks = Math.floor(age / 7);
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  }
  if (age < 365) {
    const months = Math.floor(age / 30);
    return months === 1 ? "1 month ago" : `${months} months ago`;
  }
  
  const years = Math.floor(age / 365);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}
