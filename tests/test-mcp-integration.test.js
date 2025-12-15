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
    expect(toolNames).toContain("backlog-read");
    expect(toolNames).toContain("backlog-write");
    expect(toolNames).toContain("backlog-done");
    expect(toolNames).toContain("backlog-todo-read");
    expect(toolNames).toContain("backlog-todo-write");
    expect(toolNames).toContain("backlog-todo-done");
  });

  it("should execute backlog-read (list) without errors", async () => {
    const request = {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "backlog-read",
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
        name: "backlog-write",
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
        name: "backlog-write",
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
        name: "backlog-write",
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
        name: "backlog-read",
        arguments: {},
      },
    };

    const response = await sendMCPRequest(request);
    
    expect(response.result).toBeDefined();
    const content = response.result.content[0].text;
    expect(content).toContain("Test List Item");
  });

  it("should handle backlog-todo operations", async () => {
    // Create a backlog item first
    await sendMCPRequest({
      jsonrpc: "2.0",
      id: 7,
      method: "tools/call",
      params: {
        name: "backlog-write",
        arguments: {
          action: "create",
          topic: "Todo Test Item",
          description: "Item for testing todos",
        },
      },
    });

    // Create a todo
    const createRequest = {
      jsonrpc: "2.0",
      id: 8,
      method: "tools/call",
      params: {
        name: "backlog-todo-write",
        arguments: {
          action: "create",
          topic: "Todo Test Item",
          content: "Test todo task",
        },
      },
    };

    const createResponse = await sendMCPRequest(createRequest);
    expect(createResponse.result.isError).not.toBe(true);
    expect(createResponse.result.content[0].text).toContain("Created todo");

    // List todos
    const listRequest = {
      jsonrpc: "2.0",
      id: 9,
      method: "tools/call",
      params: {
        name: "backlog-todo-read",
        arguments: {
          topic: "Todo Test Item",
        },
      },
    };

    const listResponse = await sendMCPRequest(listRequest);
    expect(listResponse.result.isError).not.toBe(true);
    const todos = JSON.parse(listResponse.result.content[0].text);
    expect(todos).toBeArray();
    expect(todos.length).toBeGreaterThan(0);
  });

  it("should return error for missing required parameters", async () => {
    const request = {
      jsonrpc: "2.0",
      id: 10,
      method: "tools/call",
      params: {
        name: "backlog-write",
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
});
