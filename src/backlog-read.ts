import { tool } from "@opencode-ai/plugin";
import { listBacklogItems, formatBacklogAge, isBacklogStale, getBacklogItem } from '../lib/backlog-shared';
import { format } from '../lib/markdown-formatter';

export default tool({
  description: "Read-only access to backlog items - list and view backlog work items",
  args: {
    topic: tool.schema
      .string()
      .optional()
      .describe("Topic name to fetch a single backlog item with full content"),
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
    const { topic, status, priority, showAge = true } = args;
    
    // If topic is provided, fetch single item
    if (topic) {
      const item = await getBacklogItem(topic);
      
      if (!item) {
        return `Backlog item not found: ${topic}`;
      }
      
      // Return full item details including description
      const result = {
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
        result['age'] = formatBacklogAge(item.created);
        result['isStale'] = isBacklogStale(item.created);
      }
      
      return JSON.stringify(result, null, 2);
    }
    
    // Otherwise, list items
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