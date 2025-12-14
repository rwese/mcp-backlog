import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { 
  getXDGDataHome, 
  getBacklogRootDir, 
  getProjectIdentifier,
  getProjectBacklogDir,
  getBacklogDir,
  getCompletedBacklogDir,
  getPathInfo
} from "../lib/path-resolver.ts";
import { join } from "path";
import { homedir } from "os";

describe("Path Resolver", () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("XDG Base Directory", () => {
    it("should use XDG_DATA_HOME if set", () => {
      process.env.XDG_DATA_HOME = "/custom/data";
      expect(getXDGDataHome()).toBe("/custom/data");
    });

    it("should use default ~/.local/share if XDG_DATA_HOME not set", () => {
      delete process.env.XDG_DATA_HOME;
      expect(getXDGDataHome()).toBe(join(homedir(), '.local', 'share'));
    });
  });

  describe("Backlog Root Directory", () => {
    it("should use MCP_BACKLOG_DIR if set", () => {
      process.env.MCP_BACKLOG_DIR = "/custom/backlog";
      const root = getBacklogRootDir();
      expect(root.endsWith("/custom/backlog")).toBe(true);
    });

    it("should use XDG-compliant directory by default", () => {
      delete process.env.MCP_BACKLOG_DIR;
      const root = getBacklogRootDir();
      expect(root.includes("mcp-backlog")).toBe(true);
    });
  });

  describe("Project Identification", () => {
    it("should return a project identifier", () => {
      const projectId = getProjectIdentifier();
      expect(projectId).toBeTruthy();
      expect(typeof projectId).toBe("string");
      expect(projectId.length).toBeGreaterThan(0);
    });

    it("should use git root basename for git repos", () => {
      const projectId = getProjectIdentifier();
      // This repo should use "mcp-backlog" from git root
      expect(projectId).toBe("mcp-backlog");
    });
  });

  describe("Project Backlog Directory", () => {
    it("should include project identifier in path", () => {
      delete process.env.MCP_BACKLOG_DIR;
      const projectDir = getProjectBacklogDir();
      const projectId = getProjectIdentifier();
      expect(projectDir).toContain(projectId);
    });

    it("should create separate directories for different projects", () => {
      const dir1 = getProjectBacklogDir();
      expect(dir1).toBeTruthy();
      // Project isolation should be in the path
      expect(dir1).toContain("projects");
    });
  });

  describe("Backlog Subdirectories", () => {
    it("should provide Backlog directory path", () => {
      const backlogDir = getBacklogDir();
      expect(backlogDir).toContain("Backlog");
      expect(backlogDir).toBeTruthy();
    });

    it("should provide COMPLETED_Backlog directory path", () => {
      const completedDir = getCompletedBacklogDir();
      expect(completedDir).toContain("COMPLETED_Backlog");
      expect(completedDir).toBeTruthy();
    });
  });

  describe("Path Info", () => {
    it("should return complete path information", () => {
      const info = getPathInfo();
      expect(info.rootDir).toBeTruthy();
      expect(info.projectId).toBeTruthy();
      expect(info.projectDir).toBeTruthy();
      expect(info.backlogDir).toBeTruthy();
      expect(info.completedDir).toBeTruthy();
      expect(typeof info.isLegacy).toBe("boolean");
    });
  });
});
