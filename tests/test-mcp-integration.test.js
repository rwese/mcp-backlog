import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { spawn } from "child_process";
import { writeFileSync, rmSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

/**
 * Integration tests for MCP server
 * These tests verify that the bundled dist/index.js works correctly
 * and catches issues like missing imports that would cause runtime errors
 */

describe("MCP Server Integration Tests", () => {
  let testDir;
  let originalCwd;
  let originalEnv;

  beforeAll(() => {
    // Create isolated test directory
    testDir = join(tmpdir(), `mcp-backlog-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    
    // Save original state
    originalCwd = process.cwd();
    originalEnv = { ...process.env };
    
    // Setup test environment
    process.env.MCP_BACKLOG_DIR = testDir;
    
    // Initialize git repo for project identification
    const { execSync } = require("child_process");
    try {
      execSync("git init", { cwd: testDir, stdio: "ignore" });
    } catch (e) {
      // Ignore if git not available
    }
  });

  afterAll(() => {
    // Restore original state
    process.env = originalEnv;
    
    // Cleanup test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  /**
   * Helper to send MCP request and get response
   */
  async function sendMCPRequest(request) {
    return new Promise((resolve, reject) => {
      const serverPath = join(process.cwd(), "dist/index.js");
      const child = spawn("node", [serverPath], {
        env: { ...process.env, MCP_BACKLOG_DIR: testDir },
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";
      let timeout;

      child.stdout.on("data", (data) => {
        stdout += data.toString();
        // Look for JSON-RPC response
        const lines = stdout.split("\n");
        for (const line of lines) {
          if (line.trim() && line.includes('"jsonrpc"')) {
            clearTimeout(timeout);
            child.kill();
            try {
              resolve(JSON.parse(line));
            } catch (e) {
              reject(new Error(`Invalid JSON response: ${line}`));
            }
            return;
          }
        }
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      child.on("exit", (code) => {
        clearTimeout(timeout);
        if (code !== 0 && code !== null) {
          reject(new Error(`Server exited with code ${code}\nstderr: ${stderr}`));
        }
      });

      // Set timeout
      timeout = setTimeout(() => {
        child.kill();
        reject(new Error(`Request timeout\nstdout: ${stdout}\nstderr: ${stderr}`));
      }, 5000);

      // Send request
      child.stdin.write(JSON.stringify(request) + "\n");
    });
  }

  it("should list available tools", async () => {
    const request = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
    };

    const response = await sendMCPRequest(request);
    
    expect(response.result).toBeDefined();
    expect(response.result.tools).toBeArray();
    expect(response.result.tools.length).toBeGreaterThan(0);
    
    const toolNames = response.result.tools.map(t => t.name);
    expect(toolNames).toContain("read");
    expect(toolNames).toContain("write");
    expect(toolNames).toContain("done");
    expect(toolNames).toContain("ticket-read");
    expect(toolNames).toContain("ticket-write");
    expect(toolNames).toContain("ticket-done");
    expect(toolNames).toContain("prune");
  });

  it("should execute backlog-read (list) without errors", async () => {
    const request = {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "read",
        arguments: {},
      },
    };

    const response = await sendMCPRequest(request);
    
    expect(response.result).toBeDefined();
    expect(response.result.content).toBeArray();
    expect(response.result.content[0].type).toBe("text");
    expect(response.result.isError).not.toBe(true);
  });

  it("should execute backlog-write (list) without errors", async () => {
    const request = {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "write",
        arguments: {
          action: "list",
        },
      },
    };

    const response = await sendMCPRequest(request);
    
    expect(response.result).toBeDefined();
    expect(response.result.content).toBeArray();
    expect(response.result.isError).not.toBe(true);
  });

  it("should create a backlog item successfully", async () => {
    const request = {
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: {
        name: "write",
        arguments: {
          action: "create",
          topic: "Test Item",
          description: "This is a test backlog item",
          priority: "high",
        },
      },
    };

    const response = await sendMCPRequest(request);
    
    expect(response.result).toBeDefined();
    expect(response.result.content[0].text).toContain("Created backlog item");
    expect(response.result.isError).not.toBe(true);
  });

  it("should list backlog items after creation", async () => {
    // First create an item
    await sendMCPRequest({
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: {
        name: "write",
        arguments: {
          action: "create",
          topic: "Test List Item",
          description: "Item for testing list",
          priority: "medium",
        },
      },
    });

    // Then list items
    const request = {
      jsonrpc: "2.0",
      id: 6,
      method: "tools/call",
      params: {
        name: "read",
        arguments: {},
      },
    };

    const response = await sendMCPRequest(request);
    
    expect(response.result).toBeDefined();
    const content = response.result.content[0].text;
    expect(content).toContain("Test List Item");
  });

  it("should handle backlog-ticket operations", async () => {
    // Create a backlog item first
    await sendMCPRequest({
      jsonrpc: "2.0",
      id: 7,
      method: "tools/call",
      params: {
        name: "write",
        arguments: {
          action: "create",
          topic: "Ticket Test Item",
          description: "Item for testing tickets",
        },
      },
    });

    // Create a ticket
    const createRequest = {
      jsonrpc: "2.0",
      id: 8,
      method: "tools/call",
      params: {
        name: "ticket-write",
        arguments: {
          action: "create",
          topic: "Ticket Test Item",
          content: "Test ticket task",
        },
      },
    };

    const createResponse = await sendMCPRequest(createRequest);
    expect(createResponse.result.isError).not.toBe(true);
    expect(createResponse.result.content[0].text).toContain("Created todo");

    // List tickets
    const listRequest = {
      jsonrpc: "2.0",
      id: 9,
      method: "tools/call",
      params: {
        name: "ticket-read",
        arguments: {
          topic: "Ticket Test Item",
        },
      },
    };

    const listResponse = await sendMCPRequest(listRequest);
    expect(listResponse.result.isError).not.toBe(true);
    const tickets = JSON.parse(listResponse.result.content[0].text);
    expect(tickets).toBeArray();
    expect(tickets.length).toBeGreaterThan(0);
  });

  it("should return error for missing required parameters", async () => {
    const request = {
      jsonrpc: "2.0",
      id: 10,
      method: "tools/call",
      params: {
        name: "write",
        arguments: {
          action: "create",
          // Missing topic and description
        },
      },
    };

    const response = await sendMCPRequest(request);
    
    expect(response.result.isError).toBe(true);
    expect(response.result.content[0].text).toContain("Error");
  });

  it("should handle unknown tool gracefully", async () => {
    const request = {
      jsonrpc: "2.0",
      id: 11,
      method: "tools/call",
      params: {
        name: "nonexistent-tool",
        arguments: {},
      },
    };

    const response = await sendMCPRequest(request);
    
    expect(response.result.isError).toBe(true);
    expect(response.result.content[0].text).toContain("Unknown tool");
  });

  it("should fetch single backlog item by topic with full content", async () => {
    // Create a backlog item first
    await sendMCPRequest({
      jsonrpc: "2.0",
      id: 12,
      method: "tools/call",
      params: {
        name: "write",
        arguments: {
          action: "create",
          topic: "Fetch Test Item",
          description: "This is a detailed description for testing single item fetch",
          priority: "high",
        },
      },
    });

    // Fetch the item by topic
    const request = {
      jsonrpc: "2.0",
      id: 13,
      method: "tools/call",
      params: {
        name: "read",
        arguments: {
          topic: "Fetch Test Item",
        },
      },
    };

    const response = await sendMCPRequest(request);
    
    expect(response.result).toBeDefined();
    expect(response.result.isError).not.toBe(true);
    
    const item = JSON.parse(response.result.content[0].text);
    expect(item.topic).toBe("Fetch Test Item");
    expect(item.priority).toBe("high");
    expect(item.status).toBe("new");
    expect(item.description).toContain("This is a detailed description for testing single item fetch");
    expect(item.filepath).toBeDefined();
    expect(item.created).toBeDefined();
    expect(item.age).toBeDefined();
  });

  it("should return error for non-existent topic", async () => {
    const request = {
      jsonrpc: "2.0",
      id: 14,
      method: "tools/call",
      params: {
        name: "read",
        arguments: {
          topic: "Non Existent Item",
        },
      },
    };

    const response = await sendMCPRequest(request);
    
    expect(response.result).toBeDefined();
    expect(response.result.content[0].text).toContain("not found");
  });

  it("should maintain list behavior when topic is not provided", async () => {
    // Create multiple items
    await sendMCPRequest({
      jsonrpc: "2.0",
      id: 15,
      method: "tools/call",
      params: {
        name: "write",
        arguments: {
          action: "create",
          topic: "List Test 1",
          description: "First item",
          priority: "high",
        },
      },
    });

    await sendMCPRequest({
      jsonrpc: "2.0",
      id: 16,
      method: "tools/call",
      params: {
        name: "write",
        arguments: {
          action: "create",
          topic: "List Test 2",
          description: "Second item",
          priority: "low",
        },
      },
    });

    // List without topic parameter
    const request = {
      jsonrpc: "2.0",
      id: 17,
      method: "tools/call",
      params: {
        name: "read",
        arguments: {},
      },
    };

    const response = await sendMCPRequest(request);
    
    expect(response.result).toBeDefined();
    expect(response.result.isError).not.toBe(true);
    const content = response.result.content[0].text;
    expect(content).toContain("List Test 1");
    expect(content).toContain("List Test 2");
  });

  it("should list completed items with prune tool", async () => {
    const request = {
      jsonrpc: "2.0",
      id: 18,
      method: "tools/call",
      params: {
        name: "prune",
        arguments: {
          action: "list",
        },
      },
    };

    const response = await sendMCPRequest(request);
    
    expect(response.result).toBeDefined();
    expect(response.result.isError).not.toBe(true);
    // Should either show "No completed" or list items
    const content = response.result.content[0].text;
    expect(content).toMatch(/completed|Completed/i);
  });

  it("should support prune dry-run mode", async () => {
    const request = {
      jsonrpc: "2.0",
      id: 19,
      method: "tools/call",
      params: {
        name: "prune",
        arguments: {
          action: "prune",
          olderThanDays: 0,
          dryRun: true,
        },
      },
    };

    const response = await sendMCPRequest(request);
    
    expect(response.result).toBeDefined();
    expect(response.result.isError).not.toBe(true);
    const content = response.result.content[0].text;
    // Should indicate dry-run mode
    expect(content).toMatch(/DRY-RUN|No items older than/i);
  });

  it("should support clear dry-run mode", async () => {
    const request = {
      jsonrpc: "2.0",
      id: 20,
      method: "tools/call",
      params: {
        name: "prune",
        arguments: {
          action: "clear",
          dryRun: true,
        },
      },
    };

    const response = await sendMCPRequest(request);
    
    expect(response.result).toBeDefined();
    expect(response.result.isError).not.toBe(true);
    const content = response.result.content[0].text;
    // Should indicate dry-run mode or no items
    expect(content).toMatch(/DRY-RUN|No completed items/i);
  });

  it("should complete item and then list in prune", async () => {
    // Create a backlog item
    await sendMCPRequest({
      jsonrpc: "2.0",
      id: 21,
      method: "tools/call",
      params: {
        name: "write",
        arguments: {
          action: "create",
          topic: "Prune Test Item",
          description: "Item for testing prune functionality",
        },
      },
    });

    // Submit it (new -> ready)
    await sendMCPRequest({
      jsonrpc: "2.0",
      id: 22,
      method: "tools/call",
      params: {
        name: "write",
        arguments: {
          action: "submit",
          topic: "Prune Test Item",
        },
      },
    });

    // Move to review (ready -> review)
    await sendMCPRequest({
      jsonrpc: "2.0",
      id: 23,
      method: "tools/call",
      params: {
        name: "write",
        arguments: {
          action: "amend",
          topic: "Prune Test Item",
          status: "review",
        },
      },
    });

    // Approve it (review -> done)
    await sendMCPRequest({
      jsonrpc: "2.0",
      id: 24,
      method: "tools/call",
      params: {
        name: "write",
        arguments: {
          action: "approve",
          topic: "Prune Test Item",
        },
      },
    });

    // Mark it as done (archive it)
    const doneResponse = await sendMCPRequest({
      jsonrpc: "2.0",
      id: 25,
      method: "tools/call",
      params: {
        name: "done",
        arguments: {
          action: "done",
          topic: "Prune Test Item",
          summary: "Completed for prune test",
        },
      },
    });

    expect(doneResponse.result.isError).not.toBe(true);

    // List completed items
    const listResponse = await sendMCPRequest({
      jsonrpc: "2.0",
      id: 26,
      method: "tools/call",
      params: {
        name: "prune",
        arguments: {
          action: "list",
        },
      },
    });

    expect(listResponse.result.isError).not.toBe(true);
    const content = listResponse.result.content[0].text;
    expect(content).toContain("prune-test-item");
  });

  it("should handle prune with custom olderThanDays", async () => {
    const request = {
      jsonrpc: "2.0",
      id: 27,
      method: "tools/call",
      params: {
        name: "prune",
        arguments: {
          action: "prune",
          olderThanDays: 365,
          dryRun: true,
        },
      },
    };

    const response = await sendMCPRequest(request);
    
    expect(response.result).toBeDefined();
    expect(response.result.isError).not.toBe(true);
    // With 365 days, recently created items should be kept
    const content = response.result.content[0].text;
    expect(content).toMatch(/No items older than 365|Kept/i);
  });
});
