import { tool } from "@opencode-ai/plugin";
import { listBacklogItems, formatBacklogAge, isBacklogStale } from '../lib/backlog-shared';
import { format } from '../lib/markdown-formatter';

export default tool({
  description: "Read-only access to backlog items - list and view backlog work items",
  args: {
    status: tool.schema
      .enum(["new", "ready", "review", "done", "reopen", "wontfix"])
      .optional()
      .describe("Filter backlog items by status"),
    priority: tool.schema
      .enum(["high", "medium", "low"])
      .optional()
      .describe("Filter backlog items by priority"),
    showAge: tool.schema
      .boolean()
      .optional()
      .describe("Include age information (default: true)"),
  },

  async execute(args, context) {
    const { status, priority, showAge = true } = args;
    const items = await listBacklogItems(status, priority);

    if (items.length === 0) {
      return "No backlog items found";
    }

    // Enhance items with age information
    const enhancedItems = items.map(item => {
      if (!showAge) return item;

      return {
        ...item,
        age: formatBacklogAge(item.created),
        isStale: isBacklogStale(item.created)
      };
    });

    const columns = [
      { key: 'topic' },
      { key: 'priority' },
      { key: 'status' },
    ];

    if (showAge) {
      columns.push({ key: 'age' }, { key: 'isStale' });
    }

    return format(enhancedItems, { columns });
  }
});