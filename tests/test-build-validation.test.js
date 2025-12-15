import { describe, it, expect } from "bun:test";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

/**
 * Build validation tests
 * These tests verify the build output is valid and contains all required functions
 */

describe("Build Validation", () => {
  const distPath = join(process.cwd(), "dist/index.js");

  it("should have dist/index.js file", () => {
    expect(existsSync(distPath)).toBe(true);
  });

  it("should be a valid JavaScript file", () => {
    const content = readFileSync(distPath, "utf-8");
    expect(content).toContain("#!/usr/bin/env node");
    expect(content.length).toBeGreaterThan(1000); // Should be a substantial bundle
  });

  describe("Required function definitions", () => {
    const getDistContent = () => readFileSync(distPath, "utf-8");

    it("should contain handleListBacklog function", () => {
      expect(getDistContent()).toContain("handleListBacklog");
    });

    it("should contain handleBacklogRead function", () => {
      expect(getDistContent()).toContain("handleBacklogRead");
    });

    it("should contain handleBacklogWrite function", () => {
      expect(getDistContent()).toContain("handleBacklogWrite");
    });

    it("should contain handleBacklogDone function", () => {
      expect(getDistContent()).toContain("handleBacklogDone");
    });

    it("should contain handleBacklogTodoRead function", () => {
      expect(getDistContent()).toContain("handleBacklogTodoRead");
    });

    it("should contain handleBacklogTodoWrite function", () => {
      expect(getDistContent()).toContain("handleBacklogTodoWrite");
    });

    it("should contain handleBacklogTodoDone function", () => {
      expect(getDistContent()).toContain("handleBacklogTodoDone");
    });

    it("should contain parseBacklogFile function", () => {
      expect(getDistContent()).toContain("parseBacklogFile");
    });

    it("should contain generateBacklogFilename function", () => {
      expect(getDistContent()).toContain("generateBacklogFilename");
    });

    it("should contain createBacklogTemplate function", () => {
      expect(getDistContent()).toContain("createBacklogTemplate");
    });

    it("should contain amendBacklogTemplate function", () => {
      expect(getDistContent()).toContain("amendBacklogTemplate");
    });

    it("should contain validateStatusTransition function", () => {
      expect(getDistContent()).toContain("validateStatusTransition");
    });

    it("should contain readTodos function", () => {
      expect(getDistContent()).toContain("readTodos");
    });

    it("should contain writeTodos function", () => {
      expect(getDistContent()).toContain("writeTodos");
    });

    it("should contain listTodos function", () => {
      expect(getDistContent()).toContain("listTodos");
    });

    it("should contain validateDependencies function", () => {
      expect(getDistContent()).toContain("validateDependencies");
    });

    it("should contain getBacklogDir function", () => {
      expect(getDistContent()).toContain("getBacklogDir");
    });

    it("should contain getCompletedBacklogDir function", () => {
      expect(getDistContent()).toContain("getCompletedBacklogDir");
    });
  });

  describe("MCP Protocol implementation", () => {
    const getDistContent = () => readFileSync(distPath, "utf-8");

    it("should have MCP Server implementation (bundled code)", () => {
      // esbuild bundles the code, so we check for bundled artifacts
      const content = getDistContent();
      expect(content.length).toBeGreaterThan(10000); // Should be substantial bundle
    });

    it("should set up ListToolsRequestSchema handler", () => {
      const content = getDistContent();
      expect(content).toContain("ListToolsRequestSchema");
      expect(content).toContain("setRequestHandler");
    });

    it("should set up CallToolRequestSchema handler", () => {
      expect(getDistContent()).toContain("CallToolRequestSchema");
    });

    it("should define all six tools", () => {
      const content = getDistContent();
      expect(content).toContain('"backlog-read"');
      expect(content).toContain('"backlog-write"');
      expect(content).toContain('"backlog-done"');
      expect(content).toContain('"backlog-todo-read"');
      expect(content).toContain('"backlog-todo-write"');
      expect(content).toContain('"backlog-todo-done"');
    });

    it("should handle tool execution with switch cases", () => {
      const content = getDistContent();
      expect(content).toMatch(/case\s+["']backlog-read["']/);
      expect(content).toMatch(/case\s+["']backlog-write["']/);
      expect(content).toMatch(/case\s+["']backlog-done["']/);
      expect(content).toMatch(/case\s+["']backlog-todo-read["']/);
      expect(content).toMatch(/case\s+["']backlog-todo-write["']/);
      expect(content).toMatch(/case\s+["']backlog-todo-done["']/);
    });
  });

  describe("Error handling", () => {
    const getDistContent = () => readFileSync(distPath, "utf-8");

    it("should have error handling for unknown tools", () => {
      expect(getDistContent()).toContain("Unknown tool");
    });

    it("should have try-catch blocks", () => {
      const content = getDistContent();
      expect(content).toContain("try");
      expect(content).toContain("catch");
    });

    it("should return error responses with isError flag", () => {
      expect(getDistContent()).toContain("isError");
    });
  });
});
