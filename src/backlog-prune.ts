import { tool } from "@opencode-ai/plugin";
import { readdirSync, unlinkSync, statSync } from 'fs';
import { join } from 'path';
import { getCompletedBacklogDir } from '../lib/path-resolver';

interface PruneResult {
  deleted: string[];
  kept: string[];
  errors: string[];
}

/**
 * Calculate the age of a file in days
 */
function getFileAgeDays(filepath: string): number {
  const stats = statSync(filepath);
  const now = new Date();
  const mtime = new Date(stats.mtime);
  const diffMs = now.getTime() - mtime.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * List all completed backlog items
 */
function listCompletedItems(): { filepath: string; filename: string; ageDays: number }[] {
  const completedDir = getCompletedBacklogDir();
  
  try {
    const files = readdirSync(completedDir);
    return files
      .filter(f => f.endsWith('.md'))
      .map(filename => {
        const filepath = join(completedDir, filename);
        return {
          filepath,
          filename,
          ageDays: getFileAgeDays(filepath),
        };
      });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * Prune completed backlog items older than specified days
 */
function pruneCompletedItems(olderThanDays: number, dryRun: boolean): PruneResult {
  const items = listCompletedItems();
  const result: PruneResult = {
    deleted: [],
    kept: [],
    errors: [],
  };

  for (const item of items) {
    if (item.ageDays >= olderThanDays) {
      if (dryRun) {
        result.deleted.push(`${item.filename} (${item.ageDays} days old) [dry-run]`);
      } else {
        try {
          unlinkSync(item.filepath);
          result.deleted.push(`${item.filename} (${item.ageDays} days old)`);
        } catch (error: any) {
          result.errors.push(`Failed to delete ${item.filename}: ${error.message}`);
        }
      }
    } else {
      result.kept.push(`${item.filename} (${item.ageDays} days old)`);
    }
  }

  return result;
}

/**
 * Clear all completed backlog items
 */
function clearAllCompleted(dryRun: boolean): PruneResult {
  const items = listCompletedItems();
  const result: PruneResult = {
    deleted: [],
    kept: [],
    errors: [],
  };

  for (const item of items) {
    if (dryRun) {
      result.deleted.push(`${item.filename} (${item.ageDays} days old) [dry-run]`);
    } else {
      try {
        unlinkSync(item.filepath);
        result.deleted.push(`${item.filename} (${item.ageDays} days old)`);
      } catch (error: any) {
        result.errors.push(`Failed to delete ${item.filename}: ${error.message}`);
      }
    }
  }

  return result;
}

export default tool({
  description: "Prune completed/done backlog items - remove old archived items from COMPLETED_Backlog",
  args: {
    action: tool.schema
      .enum(["prune", "clear", "list"])
      .optional()
      .describe("Operation: prune (by age), clear (all), or list completed items (default: list)"),
    olderThanDays: tool.schema
      .number()
      .optional()
      .describe("For prune action: delete items older than this many days (default: 30)"),
    dryRun: tool.schema
      .boolean()
      .optional()
      .describe("Preview what would be deleted without actually deleting (default: false)"),
  },

  async execute(args) {
    const action = args.action || "list";
    const olderThanDays = args.olderThanDays ?? 30;
    const dryRun = args.dryRun ?? false;

    switch (action) {
      case "list": {
        const items = listCompletedItems();
        if (items.length === 0) {
          return "No completed backlog items found.";
        }
        
        const lines = items
          .sort((a, b) => b.ageDays - a.ageDays)
          .map(item => `- ${item.filename} (${item.ageDays} days old)`);
        
        return `Completed backlog items (${items.length} total):\n${lines.join('\n')}`;
      }

      case "prune": {
        const result = pruneCompletedItems(olderThanDays, dryRun);
        
        const lines: string[] = [];
        const prefix = dryRun ? "[DRY-RUN] " : "";
        
        if (result.deleted.length > 0) {
          lines.push(`${prefix}Deleted ${result.deleted.length} items:`);
          for (const f of result.deleted) {
            lines.push(`  - ${f}`);
          }
        } else {
          lines.push(`${prefix}No items older than ${olderThanDays} days to delete.`);
        }
        
        if (result.kept.length > 0) {
          lines.push(`\nKept ${result.kept.length} items (less than ${olderThanDays} days old)`);
        }
        
        if (result.errors.length > 0) {
          lines.push(`\nErrors:`);
          for (const e of result.errors) {
            lines.push(`  - ${e}`);
          }
        }
        
        return lines.join('\n');
      }

      case "clear": {
        const result = clearAllCompleted(dryRun);
        
        const lines: string[] = [];
        const prefix = dryRun ? "[DRY-RUN] " : "";
        
        if (result.deleted.length > 0) {
          lines.push(`${prefix}Cleared ${result.deleted.length} completed items:`);
          for (const f of result.deleted) {
            lines.push(`  - ${f}`);
          }
        } else {
          lines.push(`${prefix}No completed items to clear.`);
        }
        
        if (result.errors.length > 0) {
          lines.push(`\nErrors:`);
          for (const e of result.errors) {
            lines.push(`  - ${e}`);
          }
        }
        
        return lines.join('\n');
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }
});
