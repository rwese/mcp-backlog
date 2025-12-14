import { describe, it, expect } from "bun:test";
import { BacklogGuidancePlugin } from "../plugin/backlog-guidance.js";

describe("BacklogGuidancePlugin", () => {
  it("should add guidance after wontfix action", async () => {
    const plugin = BacklogGuidancePlugin({});
    const input = {
      tool: "backlog-write",
      args: { action: "wontfix", topic: "test" }
    };
    const output = {
      output: "Amended backlog item: .agent/Backlog/test/item.md (updated: status=wontfix)"
    };

    const result = await plugin["tool.execute.after"](input, output);

    expect(result.output).toContain("⚠️ **Important - Two-Step Process:**");
    expect(result.output).toContain("backlog-done");
    expect(result.metadata.guidanceAdded).toBe(true);
  });

  it("should add guidance after create action", async () => {
    const plugin = BacklogGuidancePlugin({});
    const input = {
      tool: "backlog-write",
      args: { action: "create", topic: "test" }
    };
    const output = {
      output: "Created backlog item: .agent/Backlog/test/item.md"
    };

    const result = await plugin["tool.execute.after"](input, output);

    expect(result.output).toContain("💡 **Next Steps:**");
    expect(result.output).toContain("backlog-todo-write");
    expect(result.metadata.guidanceAdded).toBe(true);
  });

  it("should not modify non-backlog tool outputs", async () => {
    const plugin = BacklogGuidancePlugin({});
    const input = {
      tool: "bash",
      args: { command: "ls" }
    };
    const output = {
      output: "file1.txt\nfile2.txt"
    };

    const result = await plugin["tool.execute.after"](input, output);

    expect(result.output).toBe("file1.txt\nfile2.txt");
    expect(result.metadata).toBeUndefined();
  });

  it("should handle null output gracefully", async () => {
    const plugin = BacklogGuidancePlugin({});
    const input = {
      tool: "backlog-write",
      args: { action: "create" }
    };

    const result = await plugin["tool.execute.after"](input, null);

    expect(result).toBeNull();
  });

  it("should add completion guidance after backlog-done with WONTFIX", async () => {
    const plugin = BacklogGuidancePlugin({});
    const input = {
      tool: "backlog-done",
      args: { topic: "test" }
    };
    const output = {
      output: "Marked backlog item as wontfix: .agent/COMPLETED_Backlog/WONTFIX_test.md"
    };

    const result = await plugin["tool.execute.after"](input, output);

    expect(result.output).toContain("✅ **Workflow Complete:**");
    expect(result.output).toContain("marked as cancelled");
    expect(result.output).toContain("<archived-item>");
    expect(result.metadata.guidanceAdded).toBe(true);
  });
});
