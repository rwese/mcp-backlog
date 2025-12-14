import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "node:fs";
import { join } from "path";

// Import the tools
import backlogRead from "../tool/backlog-read.ts";
import backlogWrite from "../tool/backlog-write.ts";
import backlogDone from "../tool/backlog-done.ts";

// Import shared functions
import {
  validateStatusTransition,
  parseFrontmatter,
  serializeFrontmatter,
  updateBacklogFrontmatter,
  readBacklogFile
} from "../lib/backlog-shared.ts";

// Helper function to write backlog items with directory structure
function writeBacklogItem(filepath, content) {
  const dirPath = filepath.substring(0, filepath.lastIndexOf('/'));
  fs.mkdirSync(dirPath, { recursive: true });
  fs.writeFileSync(filepath, content);
}

describe("Backlog Tools", () => {
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

  // Helper function to write backlog items with directory structure
  function writeBacklogItem(filepath, content) {
    const dirPath = filepath.substring(0, filepath.lastIndexOf('/'));
    fs.mkdirSync(dirPath, { recursive: true });
    fs.writeFileSync(filepath, content);
  }

  describe("backlogRead", () => {
    it("should list all backlog items when no filters", async () => {
      // Create test backlog items
      const item1 = `# Backlog: Test Item 1

## Priority: high
## Status: pending
## Version: 1

## Created
- Date: 2024-01-01T00:00:00.000Z
- Agent: test-agent
- Session: test-session

## Description

Test description 1
`;

      const item2 = `# Backlog: Test Item 2

## Priority: medium
## Status: in_progress
## Version: 1

## Created
- Date: 2024-01-02T00:00:00.000Z
- Agent: test-agent
- Session: test-session

## Description

Test description 2
`;

      writeBacklogItem(".agent/Backlog/test-item-1/item.md", item1);
      writeBacklogItem(".agent/Backlog/test-item-2/item.md", item2);

      const result = await backlogRead.execute({}, mockContext);

      expect(result).toContain("Test Item 1");
      expect(result).toContain("Test Item 2");
      expect(result).toContain("| topic | priority | status | age | isStale |");
    });

    it("should filter by status", async () => {
      const pendingItem = `# Backlog: Pending Item

## Priority: medium
## Status: pending
## Version: 1

## Created
- Date: 2024-01-01T00:00:00.000Z
- Agent: test-agent
- Session: test-session

## Description

Pending item
`;

      const inProgressItem = `# Backlog: In Progress Item

## Priority: medium
## Status: in_progress
## Version: 1

## Created
- Date: 2024-01-02T00:00:00.000Z
- Agent: test-agent
- Session: test-session

## Description

In progress item
`;

      writeBacklogItem(".agent/Backlog/pending-item/item.md", pendingItem);
      writeBacklogItem(".agent/Backlog/in-progress-item/item.md", inProgressItem);

      const result = await backlogRead.execute({ status: "pending" }, mockContext);

      expect(result).toContain("topic: Pending Item");
      expect(result).toContain("status: pending");
    });

    it("should filter by priority", async () => {
      const highItem = `# Backlog: High Priority Item

## Priority: high
## Status: pending
## Version: 1

## Created
- Date: 2024-01-01T00:00:00.000Z
- Agent: test-agent
- Session: test-session

## Description

High priority item
`;

      const lowItem = `# Backlog: Low Priority Item

## Priority: low
## Status: pending
## Version: 1

## Created
- Date: 2024-01-02T00:00:00.000Z
- Agent: test-agent
- Session: test-session

## Description

Low priority item
`;

      writeBacklogItem(".agent/Backlog/high-priority-item/item.md", highItem);
      writeBacklogItem(".agent/Backlog/low-priority-item/item.md", lowItem);

      const result = await backlogRead.execute({ priority: "high" }, mockContext);

      expect(result).toContain("topic: High Priority Item");
      expect(result).toContain("priority: high");
    });

    it("should return empty array when no items found", async () => {
      const result = await backlogRead.execute({}, mockContext);
      expect(result).toBe("No backlog items found");
    });
  });

  describe("backlogWrite", () => {
    it("should create a new backlog item", async () => {
      const args = {
        action: "create",
        topic: "New Test Item",
        description: "This is a test description",
        priority: "high"
      };

      const result = await backlogWrite.execute(args, mockContext);

      expect(result).toContain("Created backlog item");
      expect(result).toContain(".agent/Backlog/new-test-item/item.md");

      // Verify file was created
      expect(fs.existsSync(".agent/Backlog/new-test-item/item.md")).toBe(true);

      const content = fs.readFileSync(".agent/Backlog/new-test-item/item.md", "utf-8");
      expect(content).toContain("# Backlog: New Test Item");
      expect(content).toContain("priority: high");
      expect(content).toContain("status: new");
      expect(content).toContain("This is a test description");
      expect(content).toContain(`agent: ${mockContext.agent}`);
      expect(content).toContain(`session: ${mockContext.sessionID}`);
    });

    it("should fail to create duplicate item", async () => {
      // Create first item
      const args = {
        action: "create",
        topic: "Duplicate Item",
        description: "First description"
      };

      await backlogWrite.execute(args, mockContext);

      // Try to create duplicate
      await expect(backlogWrite.execute(args, mockContext)).rejects.toThrow(
        "Backlog item already exists"
      );
    });

    it("should require topic and description for create", async () => {
      await expect(backlogWrite.execute({ action: "create" }, mockContext)).rejects.toThrow(
        "topic and description are required"
      );

      await expect(backlogWrite.execute({ action: "create", topic: "Test" }, mockContext)).rejects.toThrow(
        "topic and description are required"
      );
    });

    it("should amend an existing backlog item", async () => {
      // Create initial item
      const createArgs = {
        action: "create",
        topic: "Amend Test Item",
        description: "Original description"
      };

      await backlogWrite.execute(createArgs, mockContext);

      // Amend it
      const amendArgs = {
        action: "amend",
        topic: "Amend Test Item",
        description: "Updated description"
      };

      const result = await backlogWrite.execute(amendArgs, mockContext);

      expect(result).toContain("Amended backlog item");
      expect(result).toContain("archived v1");

      // Verify original was archived
      expect(fs.existsSync(".agent/COMPLETED_Backlog/amend-test-item-v1.md")).toBe(true);

      // Verify new version exists
      expect(fs.existsSync(".agent/Backlog/amend-test-item/item.md")).toBe(true);

      const content = fs.readFileSync(".agent/Backlog/amend-test-item/item.md", "utf-8");
      expect(content).toContain("version: 2");
      expect(content).toContain("Updated description");
      expect(content).toContain("amended:");
      expect(content).toContain(`amendedBy: ${mockContext.agent}`);
    });

    it("should fail to amend non-existent item", async () => {
      const amendArgs = {
        action: "amend",
        topic: "Non Existent Item",
        description: "Updated description"
      };

      await expect(backlogWrite.execute(amendArgs, mockContext)).rejects.toThrow(
        "Backlog item not found"
      );
    });

    it("should require topic for amend", async () => {
      await expect(backlogWrite.execute({ action: "amend" }, mockContext)).rejects.toThrow(
        "topic is required for amend"
      );
    });

    it("should amend status only", async () => {
      // Create initial item
      const createArgs = {
        action: "create",
        topic: "Status Amend Test",
        description: "Original description",
        status: "pending",
        priority: "medium"
      };

      await backlogWrite.execute(createArgs, mockContext);

      // Amend status only
      const amendArgs = {
        action: "amend",
        topic: "Status Amend Test",
        status: "ready"
      };

      const result = await backlogWrite.execute(amendArgs, mockContext);

      expect(result).toContain("Amended backlog item");
      expect(result).toContain("updated: status=ready");

      // Verify archived version exists
      expect(fs.existsSync(".agent/COMPLETED_Backlog/status-amend-test-v1.md")).toBe(true);

      // Verify new version has updated status but preserved other fields
      const content = fs.readFileSync(".agent/Backlog/status-amend-test/item.md", "utf-8");
      expect(content).toContain("status: ready");
      expect(content).toContain("priority: medium"); // unchanged
      expect(content).toContain("(No updated description provided)"); // no description provided
      expect(content).toContain("version: 2");
      expect(content).toContain("amended:");
    });

    it("should amend priority only", async () => {
      // Create initial item
      const createArgs = {
        action: "create",
        topic: "Priority Amend Test",
        description: "Original description",
        priority: "low"
      };

      await backlogWrite.execute(createArgs, mockContext);

      // Amend priority only
      const amendArgs = {
        action: "amend",
        topic: "Priority Amend Test",
        priority: "high"
      };

      const result = await backlogWrite.execute(amendArgs, mockContext);

      expect(result).toContain("Amended backlog item");
      expect(result).toContain("updated: priority=high");

      // Verify archived version exists
      expect(fs.existsSync(".agent/COMPLETED_Backlog/priority-amend-test-v1.md")).toBe(true);

      // Verify new version has updated priority but preserved other fields
      const content = fs.readFileSync(".agent/Backlog/priority-amend-test/item.md", "utf-8");
      expect(content).toContain("priority: high");
      expect(content).toContain("status: new"); // unchanged
      expect(content).toContain("(No updated description provided)"); // no description provided
      expect(content).toContain("version: 2");
    });

    it("should amend multiple fields at once", async () => {
      // Create initial item
      const createArgs = {
        action: "create",
        topic: "Multi Amend Test",
        description: "Original description",
        status: "pending",
        priority: "medium"
      };

      await backlogWrite.execute(createArgs, mockContext);

      // Amend multiple fields
      const amendArgs = {
        action: "amend",
        topic: "Multi Amend Test",
        description: "Updated description",
        status: "ready",
        priority: "high"
      };

      const result = await backlogWrite.execute(amendArgs, mockContext);

      expect(result).toContain("Amended backlog item");
      expect(result).toContain("updated: status=ready, priority=high, description");

      // Verify archived version exists
      expect(fs.existsSync(".agent/COMPLETED_Backlog/multi-amend-test-v1.md")).toBe(true);

      // Verify new version has all updated fields
      const content = fs.readFileSync(".agent/Backlog/multi-amend-test/item.md", "utf-8");
      expect(content).toContain("status: ready");
      expect(content).toContain("priority: high");
      expect(content).toContain("Updated description");
      expect(content).toContain("version: 2");
      expect(content).toContain("amended:");
    });

    it("should amend with no changes provided (preserves current values)", async () => {
      // Create initial item
      const createArgs = {
        action: "create",
        topic: "No Changes Amend Test",
        description: "Original description",
        status: "pending",
        priority: "medium"
      };

      await backlogWrite.execute(createArgs, mockContext);

      // Amend with no changes
      const amendArgs = {
        action: "amend",
        topic: "No Changes Amend Test"
      };

      const result = await backlogWrite.execute(amendArgs, mockContext);

      expect(result).toContain("Amended backlog item");
      expect(result).not.toContain("updated:");

      // Verify archived version exists
      expect(fs.existsSync(".agent/COMPLETED_Backlog/no-changes-amend-test-v1.md")).toBe(true);

      // Verify new version preserves all original values
      const content = fs.readFileSync(".agent/Backlog/no-changes-amend-test/item.md", "utf-8");
      expect(content).toContain("status: new");
      expect(content).toContain("priority: medium");
      expect(content).toContain("(No updated description provided)");
      expect(content).toContain("version: 2");
      expect(content).toContain("amended:");
    });

    it("should preserve original content in archived version", async () => {
      // Create initial item
      const createArgs = {
        action: "create",
        topic: "Archive Preservation Test",
        description: "Original description v1",
        status: "pending",
        priority: "low"
      };

      await backlogWrite.execute(createArgs, mockContext);

      // Amend it
      const amendArgs = {
        action: "amend",
        topic: "Archive Preservation Test",
        description: "Updated description v2",
        status: "ready",
        priority: "high"
      };

      await backlogWrite.execute(amendArgs, mockContext);

      // Verify archived version has original content
      const archivedContent = fs.readFileSync(".agent/COMPLETED_Backlog/archive-preservation-test-v1.md", "utf-8");
      expect(archivedContent).toContain("# Backlog: Archive Preservation Test");
      expect(archivedContent).toContain("status: new");
      expect(archivedContent).toContain("priority: low");
      expect(archivedContent).toContain("version: 1");
      expect(archivedContent).toContain("Original description v1");
      expect(archivedContent).toContain("created:");
      expect(archivedContent).not.toContain("## Amended");

      // Verify new version has updated content
      const newContent = fs.readFileSync(".agent/Backlog/archive-preservation-test/item.md", "utf-8");
      expect(newContent).toContain("status: ready");
      expect(newContent).toContain("priority: high");
      expect(newContent).toContain("version: 2");
      expect(newContent).toContain("Updated description v2");
      expect(newContent).toContain("amended:");
    });

    it("should list items via write tool", async () => {
      // Create test item
      const createArgs = {
        action: "create",
        topic: "List Test Item",
        description: "Test description"
      };

      await backlogWrite.execute(createArgs, mockContext);

      const result = await backlogWrite.execute({ action: "list" }, mockContext);
      const items = JSON.parse(result);

      expect(items.length).toBe(1);
      expect(items[0].topic).toBe("List Test Item");
    });

    it("should submit a new item to ready status", async () => {
      // Create initial item
      const createArgs = {
        action: "create",
        topic: "Submit Test Item",
        description: "Test description"
      };

      await backlogWrite.execute(createArgs, mockContext);

      // Submit it
      const submitArgs = {
        action: "submit",
        topic: "Submit Test Item"
      };

      const result = await backlogWrite.execute(submitArgs, mockContext);

      expect(result).toContain("Amended backlog item");
      expect(result).toContain("updated: status=ready");

      // Verify status changed to ready
      const content = fs.readFileSync(".agent/Backlog/submit-test-item/item.md", "utf-8");
      expect(content).toContain("status: ready");
      expect(content).toContain("version: 2");
    });

    it("should fail to submit item not in new status", async () => {
      // Create and submit item first
      const createArgs = {
        action: "create",
        topic: "Invalid Submit Test",
        description: "Test description"
      };

      await backlogWrite.execute(createArgs, mockContext);

      const submitArgs = {
        action: "submit",
        topic: "Invalid Submit Test"
      };

      await backlogWrite.execute(submitArgs, mockContext);

      // Try to submit again (now in ready status)
      await expect(backlogWrite.execute(submitArgs, mockContext)).rejects.toThrow(
        "Cannot submit item with status 'ready'. Item must be in 'new' status to submit."
      );
    });

    it("should require topic for submit", async () => {
      await expect(backlogWrite.execute({ action: "submit" }, mockContext)).rejects.toThrow(
        "topic is required for submit action"
      );
    });

    it("should approve a review item to done status", async () => {
      // Create and move to review status
      const createArgs = {
        action: "create",
        topic: "Approve Test Item",
        description: "Test description"
      };

      await backlogWrite.execute(createArgs, mockContext);

      const submitArgs = {
        action: "submit",
        topic: "Approve Test Item"
      };

      await backlogWrite.execute(submitArgs, mockContext);

      const reviewArgs = {
        action: "amend",
        topic: "Approve Test Item",
        status: "review"
      };

      await backlogWrite.execute(reviewArgs, mockContext);

      // Now approve it
      const approveArgs = {
        action: "approve",
        topic: "Approve Test Item"
      };

      const result = await backlogWrite.execute(approveArgs, mockContext);

      expect(result).toContain("Amended backlog item");
      expect(result).toContain("updated: status=done");

      // Verify status changed to done
      const content = fs.readFileSync(".agent/Backlog/approve-test-item/item.md", "utf-8");
      expect(content).toContain("status: done");
    });

    it("should fail to approve item not in review status", async () => {
      // Create item but don't move to review
      const createArgs = {
        action: "create",
        topic: "Invalid Approve Test",
        description: "Test description"
      };

      await backlogWrite.execute(createArgs, mockContext);

      const approveArgs = {
        action: "approve",
        topic: "Invalid Approve Test"
      };

      await expect(backlogWrite.execute(approveArgs, mockContext)).rejects.toThrow(
        "Cannot approve item with status 'new'. Item must be in 'review' status to approve."
      );
    });

    it("should require topic for approve", async () => {
      await expect(backlogWrite.execute({ action: "approve" }, mockContext)).rejects.toThrow(
        "topic is required for approve action"
      );
    });

    it("should reopen a review item to reopen status", async () => {
      // Create and move through workflow to review status
      const createArgs = {
        action: "create",
        topic: "Reopen Test Item",
        description: "Test description"
      };

      await backlogWrite.execute(createArgs, mockContext);

      // Submit to ready
      const submitArgs = {
        action: "submit",
        topic: "Reopen Test Item"
      };

      await backlogWrite.execute(submitArgs, mockContext);

      // Move to review
      const reviewArgs = {
        action: "amend",
        topic: "Reopen Test Item",
        status: "review"
      };

      await backlogWrite.execute(reviewArgs, mockContext);

      // Now reopen it from review (reject scenario) with required description
      const reopenArgs = {
        action: "reopen",
        topic: "Reopen Test Item",
        description: "Needs additional work after review"
      };

      const result = await backlogWrite.execute(reopenArgs, mockContext);

      expect(result).toContain("Amended backlog item");
      expect(result).toContain("updated: status=reopen, description");

      // Verify status changed to reopen
      const content = fs.readFileSync(".agent/Backlog/reopen-test-item/item.md", "utf-8");
      expect(content).toContain("status: reopen");
      expect(content).toContain("Needs additional work after review");
    });

    it("should fail to reopen item not in review/done status", async () => {
      // Create item but don't move to review or done
      const createArgs = {
        action: "create",
        topic: "Invalid Reopen Test",
        description: "Test description"
      };

      await backlogWrite.execute(createArgs, mockContext);

      const reopenArgs = {
        action: "reopen",
        topic: "Invalid Reopen Test",
        description: "Review notes"
      };

      await expect(backlogWrite.execute(reopenArgs, mockContext)).rejects.toThrow(
        "Cannot reopen item with status 'new'. Item must be in 'review' or 'done' status to reopen."
      );
    });

    it("should require topic for reopen", async () => {
      await expect(backlogWrite.execute({ action: "reopen" }, mockContext)).rejects.toThrow(
        "topic is required for reopen action"
      );
    });
  });

  describe("backlogDone", () => {
    it("should mark item as done without summary", async () => {
      // Create test item
      const createArgs = {
        action: "create",
        topic: "Done Test Item",
        description: "Test description"
      };

      await backlogWrite.execute(createArgs, mockContext);

      // Mark as done
      const doneArgs = {
        action: "done",
        topic: "Done Test Item"
      };

      const result = await backlogDone.execute(doneArgs, mockContext);

      expect(result).toContain("Marked backlog item as done");
      expect(result).toContain(".agent/COMPLETED_Backlog/DONE_done-test-item.md");

      // Verify item was moved and marked as done
      expect(fs.existsSync(".agent/COMPLETED_Backlog/DONE_done-test-item.md")).toBe(true);
      expect(fs.existsSync(".agent/Backlog/done-test-item/item.md")).toBe(false);
      // Verify entire directory is removed
      expect(fs.existsSync(".agent/Backlog/done-test-item")).toBe(false);

      const content = fs.readFileSync(".agent/COMPLETED_Backlog/DONE_done-test-item.md", "utf-8");
      expect(content).toContain("status: done");
      expect(content).toContain("## Completed");
      expect(content).toContain(`- Agent: ${mockContext.agent}`);
      expect(content).not.toContain("### Summary");
    });

    it("should mark item as done with summary", async () => {
      // Create test item
      const createArgs = {
        action: "create",
        topic: "Done With Summary Item",
        description: "Test description"
      };

      await backlogWrite.execute(createArgs, mockContext);

      // Mark as done with summary
      const doneArgs = {
        action: "done",
        topic: "Done With Summary Item",
        summary: "This task was completed successfully. Learned about testing."
      };

      const result = await backlogDone.execute(doneArgs, mockContext);

      expect(result).toContain("Marked backlog item as done");
      expect(result).toContain("(with summary)");

      // Verify summary appears in completed file
      const content = fs.readFileSync(".agent/COMPLETED_Backlog/DONE_done-with-summary-item.md", "utf-8");
      expect(content).toContain("## Completed");
      expect(content).toContain("### Summary");
      expect(content).toContain("This task was completed successfully");
      expect(content).toContain("Learned about testing");
    });

    it("should remove entire directory including todos.json when marking as done", async () => {
      // Create test item
      const createArgs = {
        action: "create",
        topic: "Directory Cleanup Test",
        description: "Test that entire directory is removed"
      };

      await backlogWrite.execute(createArgs, mockContext);

      // Manually create a todos.json file to simulate having todos
      const todoPath = ".agent/Backlog/directory-cleanup-test/todos.json";
      fs.writeFileSync(todoPath, JSON.stringify([
        { id: "1", content: "Test todo", status: "pending" }
      ]));

      // Verify setup
      expect(fs.existsSync(".agent/Backlog/directory-cleanup-test/item.md")).toBe(true);
      expect(fs.existsSync(todoPath)).toBe(true);

      // Mark as done
      const doneArgs = {
        action: "done",
        topic: "Directory Cleanup Test"
      };

      await backlogDone.execute(doneArgs, mockContext);

      // Verify entire directory is removed, including todos.json
      expect(fs.existsSync(".agent/Backlog/directory-cleanup-test")).toBe(false);
      expect(fs.existsSync(".agent/Backlog/directory-cleanup-test/item.md")).toBe(false);
      expect(fs.existsSync(todoPath)).toBe(false);

      // Verify completed file exists
      expect(fs.existsSync(".agent/COMPLETED_Backlog/DONE_directory-cleanup-test.md")).toBe(true);
    });

    it("should fail to mark non-existent item as done", async () => {
      const doneArgs = {
        action: "done",
        topic: "Non Existent Item"
      };

      await expect(backlogDone.execute(doneArgs, mockContext)).rejects.toThrow(
        "Backlog item not found"
      );
    });

    it("should require topic for done", async () => {
      await expect(backlogDone.execute({ action: "done" }, mockContext)).rejects.toThrow(
        "topic is required for done"
      );
    });

    it("should list items via done tool", async () => {
      // Create test item
      const createArgs = {
        action: "create",
        topic: "Done List Test Item",
        description: "Test description"
      };

      await backlogWrite.execute(createArgs, mockContext);

      const result = await backlogDone.execute({ action: "list" }, mockContext);
      const items = JSON.parse(result);

      expect(items.length).toBe(1);
      expect(items[0].topic).toBe("Done List Test Item");
    });
  });

  describe("Status Workflow", () => {
    it("should allow full workflow transitions: new → ready → review → done", async () => {
      // Create initial item (new status)
      const createArgs = {
        action: "create",
        topic: "Full Workflow Test Item",
        description: "Test full workflow"
      };

      await backlogWrite.execute(createArgs, mockContext);

      // Verify initial status is new
      let content = fs.readFileSync(".agent/Backlog/full-workflow-test-item/item.md", "utf-8");
      expect(content).toContain("status: new");

      // Transition: new → ready (submit)
      const submitArgs = {
        action: "submit",
        topic: "Full Workflow Test Item"
      };

      await backlogWrite.execute(submitArgs, mockContext);

      content = fs.readFileSync(".agent/Backlog/full-workflow-test-item/item.md", "utf-8");
      expect(content).toContain("status: ready");
      expect(content).toContain("version: 2");

      // Transition: ready → review (amend)
      const reviewArgs = {
        action: "amend",
        topic: "Full Workflow Test Item",
        status: "review"
      };

      await backlogWrite.execute(reviewArgs, mockContext);

      content = fs.readFileSync(".agent/Backlog/full-workflow-test-item/item.md", "utf-8");
      expect(content).toContain("status: review");
      expect(content).toContain("version: 3");

      // Transition: review → done (approve)
      const approveArgs = {
        action: "approve",
        topic: "Full Workflow Test Item"
      };

      await backlogWrite.execute(approveArgs, mockContext);

      content = fs.readFileSync(".agent/Backlog/full-workflow-test-item/item.md", "utf-8");
      expect(content).toContain("status: done");
      expect(content).toContain("version: 4");
    });

    it("should reject invalid status transitions", () => {
      // Test invalid transitions using validateStatusTransition directly
      expect(() => validateStatusTransition("new", "review")).toThrow(
        "Invalid status transition from 'new' to 'review'"
      );

      expect(() => validateStatusTransition("ready", "done")).toThrow(
        "Invalid status transition from 'ready' to 'done'"
      );

      expect(() => validateStatusTransition("review", "ready")).toThrow(
        "Invalid status transition from 'review' to 'ready'"
      );

      expect(() => validateStatusTransition("done", "review")).toThrow(
        "Invalid status transition from 'done' to 'review'"
      );

      expect(() => validateStatusTransition("done", "ready")).toThrow(
        "Invalid status transition from 'done' to 'ready'"
      );

      expect(() => validateStatusTransition("reopen", "done")).toThrow(
        "Invalid status transition from 'reopen' to 'done'"
      );

      // Test valid transitions don't throw
      expect(() => validateStatusTransition("new", "ready")).not.toThrow();
      expect(() => validateStatusTransition("new", "done")).not.toThrow(); // cancel
      expect(() => validateStatusTransition("ready", "review")).not.toThrow();
      expect(() => validateStatusTransition("ready", "new")).not.toThrow(); // back for edits
      expect(() => validateStatusTransition("review", "done")).not.toThrow();
      expect(() => validateStatusTransition("review", "reopen")).not.toThrow();
      expect(() => validateStatusTransition("reopen", "review")).not.toThrow();

      // Test same status is allowed
      expect(() => validateStatusTransition("new", "new")).not.toThrow();
    });

    it("should reopen with review notes from review status", async () => {
      // Create and move to review (reject scenario)
      const createArgs = {
        action: "create",
        topic: "Reopen Review Notes Test",
        description: "Test reopen with notes"
      };

      await backlogWrite.execute(createArgs, mockContext);

      // Move through workflow to review
      await backlogWrite.execute({ action: "submit", topic: "Reopen Review Notes Test" }, mockContext);
      await backlogWrite.execute({ action: "amend", topic: "Reopen Review Notes Test", status: "review" }, mockContext);

      // Reopen with review notes (rejected in review)
      const reopenArgs = {
        action: "reopen",
        topic: "Reopen Review Notes Test",
        description: "Reopening due to additional requirements discovered during review"
      };

      const result = await backlogWrite.execute(reopenArgs, mockContext);

      expect(result).toContain("Amended backlog item");
      expect(result).toContain("updated: status=reopen, description");

      // Verify status changed to reopen and notes were added
      const content = fs.readFileSync(".agent/Backlog/reopen-review-notes-test/item.md", "utf-8");
      expect(content).toContain("status: reopen");
      expect(content).toContain("Reopening due to additional requirements discovered during review");
      expect(content).toContain("version: 4");
      expect(content).toContain("amended:");
    });

    it("should validate terminal state behavior", async () => {
      // Create and complete workflow to done
      const createArgs = {
        action: "create",
        topic: "Terminal State Test",
        description: "Test terminal state"
      };

      await backlogWrite.execute(createArgs, mockContext);

      // Move to done
      await backlogWrite.execute({ action: "submit", topic: "Terminal State Test" }, mockContext);
      await backlogWrite.execute({ action: "amend", topic: "Terminal State Test", status: "review" }, mockContext);
      await backlogWrite.execute({ action: "approve", topic: "Terminal State Test" }, mockContext);

      // Verify done is terminal - cannot transition to other states
      expect(() => validateStatusTransition("done", "new")).toThrow();
      expect(() => validateStatusTransition("done", "ready")).toThrow();
      expect(() => validateStatusTransition("done", "review")).toThrow();
      expect(() => validateStatusTransition("done", "reopen")).toThrow();

      // Same status allowed
      expect(() => validateStatusTransition("done", "done")).not.toThrow();

      let content = fs.readFileSync(".agent/Backlog/terminal-state-test/item.md", "utf-8");
      expect(content).toContain("status: done");

      // Test reopen workflow separately (from review, not done)
      await backlogWrite.execute({ action: "create", topic: "Reopen Workflow Test", description: "Test" }, mockContext);
      await backlogWrite.execute({ action: "submit", topic: "Reopen Workflow Test" }, mockContext);
      await backlogWrite.execute({ action: "amend", topic: "Reopen Workflow Test", status: "review" }, mockContext);
      
      // Reopen from review (rejected)
      await backlogWrite.execute({ action: "reopen", topic: "Reopen Workflow Test", description: "Needs fixes" }, mockContext);
      
      content = fs.readFileSync(".agent/Backlog/reopen-workflow-test/item.md", "utf-8");
      expect(content).toContain("status: reopen");

      // From reopen, can go back to review
      await backlogWrite.execute({ action: "amend", topic: "Reopen Workflow Test", status: "review" }, mockContext);

      content = fs.readFileSync(".agent/Backlog/reopen-workflow-test/item.md", "utf-8");
      expect(content).toContain("status: review");
    });
  });
});

describe("Frontmatter Utilities", () => {
  beforeEach(() => {
    // Create test directories
    if (!fs.existsSync(".agent")) {
      fs.mkdirSync(".agent/Backlog", { recursive: true });
      fs.mkdirSync(".agent/COMPLETED_Backlog", { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(".agent")) {
      fs.rmSync(".agent", { recursive: true, force: true });
    }
  });

  describe("parseFrontmatter", () => {
    it("should parse frontmatter correctly", () => {
      const content = `---
topic: "Test Topic"
priority: high
status: new
version: 1
created: 2024-01-01T00:00:00.000Z
agent: test-agent
---

# Body content
This is the body.`;

      const result = parseFrontmatter(content);

      expect(result).toBeTruthy();
      if (result) {
        expect(result.frontmatter.topic).toBe("Test Topic");
        expect(result.frontmatter.priority).toBe("high");
        expect(result.frontmatter.status).toBe("new");
        expect(result.frontmatter.version).toBe(1);
        expect(result.frontmatter.created).toBe("2024-01-01T00:00:00.000Z");
        expect(result.frontmatter.agent).toBe("test-agent");
        expect(result.body).toBe("\n# Body content\nThis is the body.");
      }
    });

    it("should handle quoted strings with spaces and colons", () => {
      const content = `---
topic: "Topic with spaces: and colons"
description: "A description with: colons"
---

Body`;

      const result = parseFrontmatter(content);

      expect(result).toBeTruthy();
      if (result) {
        expect(result.frontmatter.topic).toBe("Topic with spaces: and colons");
        expect(result.frontmatter.description).toBe("A description with: colons");
      }
    });

    it("should parse numbers and booleans", () => {
      const content = `---
version: 5
enabled: true
disabled: false
---

Body`;

      const result = parseFrontmatter(content);

      expect(result).toBeTruthy();
      if (result) {
        expect(result.frontmatter.version).toBe(5);
        expect(result.frontmatter.enabled).toBe(true);
        expect(result.frontmatter.disabled).toBe(false);
      }
    });

    it("should return null for content without frontmatter", () => {
      const content = `# Just markdown
No frontmatter here.`;

      const result = parseFrontmatter(content);

      expect(result).toBeNull();
    });
  });

  describe("serializeFrontmatter", () => {
    it("should serialize frontmatter correctly", () => {
      const frontmatter = {
        topic: "Test Topic",
        priority: "high",
        status: "new",
        version: 1,
        created: "2024-01-01T00:00:00.000Z",
        agent: "test-agent"
      };
      const body = "\n# Body content\nThis is the body.";

      const result = serializeFrontmatter(frontmatter, body);

      expect(result).toContain("---");
      expect(result).toContain("topic: \"Test Topic\"");
      expect(result).toContain("priority: high");
      expect(result).toContain("status: new");
      expect(result).toContain("version: 1");
      expect(result).toContain("created: \"2024-01-01T00:00:00.000Z\"");
      expect(result).toContain("agent: test-agent");
      expect(result).toContain("# Body content");
    });

    it("should quote strings with spaces or colons", () => {
      const frontmatter = {
        topic: "Topic with spaces",
        description: "Description: with colon"
      };
      const body = "Body";

      const result = serializeFrontmatter(frontmatter, body);

      expect(result).toContain('topic: "Topic with spaces"');
      expect(result).toContain('description: "Description: with colon"');
    });

    it("should handle numbers and booleans", () => {
      const frontmatter = {
        version: 5,
        enabled: true,
        disabled: false
      };
      const body = "Body";

      const result = serializeFrontmatter(frontmatter, body);

      expect(result).toContain("version: 5");
      expect(result).toContain("enabled: true");
      expect(result).toContain("disabled: false");
    });

    it("should skip null and undefined values", () => {
      const frontmatter = {
        topic: "Test",
        empty: null,
        missing: undefined
      };
      const body = "Body";

      const result = serializeFrontmatter(frontmatter, body);

      expect(result).toContain("topic: Test");
      expect(result).not.toContain("empty:");
      expect(result).not.toContain("missing:");
    });
  });

  describe("updateBacklogFrontmatter", () => {
    it("should update frontmatter properties", async () => {
      const initialContent = `---
topic: "Test Topic"
priority: medium
status: new
version: 1
---

# Body
Original body.`;

      writeBacklogItem(".agent/Backlog/test-item/item.md", initialContent);

      await updateBacklogFrontmatter(".agent/Backlog/test-item/item.md", {
        status: "done",
        completedAt: "2024-01-02T00:00:00.000Z"
      });

      const updatedContent = fs.readFileSync(".agent/Backlog/test-item/item.md", "utf-8");

      expect(updatedContent).toContain("status: done");
      expect(updatedContent).toContain("completedAt: \"2024-01-02T00:00:00.000Z\"");
      expect(updatedContent).toContain("priority: medium"); // unchanged
      expect(updatedContent).toContain("# Body");
      expect(updatedContent).toContain("Original body.");
    });

    it("should throw error for file without frontmatter", async () => {
      const legacyContent = `# Backlog: Legacy Item
## Status: new

Legacy content.`;

      writeBacklogItem(".agent/Backlog/legacy-item/item.md", legacyContent);

      await expect(updateBacklogFrontmatter(".agent/Backlog/legacy-item/item.md", { status: "done" }))
        .rejects.toThrow("File does not have frontmatter");
    });
  });

  describe("readBacklogFile", () => {
    it("should read frontmatter format", async () => {
      const content = `---
topic: "Test Topic"
priority: high
status: new
version: 1
---

# Body content
This is the body.`;

      writeBacklogItem(".agent/Backlog/test-item/item.md", content);

      const result = await readBacklogFile(".agent/Backlog/test-item/item.md");

      expect(result.format).toBe("frontmatter");
      expect(result.frontmatter.topic).toBe("Test Topic");
      expect(result.frontmatter.priority).toBe("high");
      expect(result.frontmatter.status).toBe("new");
      expect(result.frontmatter.version).toBe(1);
      expect(result.body).toBe("\n# Body content\nThis is the body.");
    });

    it("should read legacy format", async () => {
      const content = `# Backlog: Legacy Topic

## Priority: high
## Status: ready
## Version: 2

## Created
- Date: 2024-01-01T00:00:00.000Z
- Agent: legacy-agent
- Session: legacy-session

## Description

Legacy description.`;

      writeBacklogItem(".agent/Backlog/legacy-item/item.md", content);

      const result = await readBacklogFile(".agent/Backlog/legacy-item/item.md");

      expect(result.format).toBe("legacy");
      expect(result.frontmatter.topic).toBe("Legacy Topic");
      expect(result.frontmatter.priority).toBe("high");
      expect(result.frontmatter.status).toBe("ready");
      expect(result.frontmatter.version).toBe(2);
      expect(result.frontmatter.created).toBe("2024-01-01T00:00:00.000Z");
      expect(result.frontmatter.agent).toBe("legacy-agent");
      expect(result.frontmatter.session).toBe("legacy-session");
      expect(result.body).toBe(content);
    });
  });

  describe("Round-trip compatibility", () => {
    it("should maintain data integrity through parse → serialize → parse", () => {
      const originalFrontmatter = {
        topic: "Round Trip Topic",
        priority: "high",
        status: "new",
        version: 1,
        created: "2024-01-01T00:00:00.000Z",
        agent: "test-agent",
        description: "A description with: colons and spaces"
      };
      const body = "\n# Body\nSome content.";

      // Serialize
      const serialized = serializeFrontmatter(originalFrontmatter, body);

      // Parse
      const parsed = parseFrontmatter(serialized);

      expect(parsed).toBeTruthy();
      if (parsed) {
        expect(parsed.frontmatter).toEqual(originalFrontmatter);
        expect(parsed.body).toBe(body);
      }
    });

    it("should handle special characters correctly", () => {
      const frontmatter = {
        topic: "Topic: with colon",
        description: "Description with spaces and: colons",
        notes: "Notes with \"quotes\" and 'single quotes'"
      };
      const body = "Body with: special chars";

      const serialized = serializeFrontmatter(frontmatter, body);
      const parsed = parseFrontmatter(serialized);

      expect(parsed).toBeTruthy();
      if (parsed) {
        expect(parsed.frontmatter).toEqual(frontmatter);
        expect(parsed.body).toBe(body);
      }
    });
  });
});

describe("Backlog Age Functions", () => {
  it("should calculate backlog age correctly", () => {
    const { calculateBacklogAge } = require("../lib/backlog-shared.js");
    
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const age = calculateBacklogAge(oneDayAgo);
    
    expect(age).toBe(1);
  });

  it("should detect stale backlogs", () => {
    const { isBacklogStale } = require("../lib/backlog-shared.js");
    
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const today = new Date().toISOString();
    
    expect(isBacklogStale(thirtyDaysAgo, 30)).toBe(true);
    expect(isBacklogStale(today, 30)).toBe(false);
  });

  it("should format backlog age as human-readable", () => {
    const { formatBacklogAge } = require("../lib/backlog-shared.js");
    
    const today = new Date().toISOString();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    expect(formatBacklogAge(today)).toBe("today");
    expect(formatBacklogAge(oneDayAgo)).toBe("1 day ago");
    expect(formatBacklogAge(oneWeekAgo)).toBe("1 week ago");
  });
});
