import { execSync } from 'child_process';
import { createHash } from 'crypto';
import { homedir } from 'os';
import { resolve, join } from 'path';
import { existsSync } from 'fs';

/**
 * Get XDG Base Directory paths following XDG Base Directory Specification
 * @see https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html
 */
export function getXDGDataHome(): string {
  return process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share');
}

export function getXDGConfigHome(): string {
  return process.env.XDG_CONFIG_HOME || join(homedir(), '.config');
}

export function getXDGCacheHome(): string {
  return process.env.XDG_CACHE_HOME || join(homedir(), '.cache');
}

/**
 * Get the root directory for MCP backlog data
 * Priority:
 * 1. MCP_BACKLOG_DIR environment variable (for custom locations)
 * 2. XDG_DATA_HOME/mcp-backlog (XDG-compliant default)
 * 3. Current working directory .agent (legacy fallback)
 */
export function getBacklogRootDir(): string {
  // Allow override via environment variable
  if (process.env.MCP_BACKLOG_DIR) {
    return resolve(process.env.MCP_BACKLOG_DIR);
  }

  // Use XDG-compliant directory by default
  const xdgDataHome = getXDGDataHome();
  const backlogDir = join(xdgDataHome, 'mcp-backlog');

  // If legacy .agent directory exists in CWD and XDG dir doesn't, use legacy
  const legacyDir = join(process.cwd(), '.agent');
  if (existsSync(legacyDir) && !existsSync(backlogDir)) {
    return legacyDir;
  }

  return backlogDir;
}

/**
 * Get project identifier for multi-project isolation
 * Uses git repository root if available, otherwise creates hash from cwd
 */
export function getProjectIdentifier(): string {
  try {
    // Try to get git root directory
    const gitRoot = execSync('git rev-parse --show-toplevel', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();

    // Use the basename of the git root as identifier
    const parts = gitRoot.split('/');
    return parts[parts.length - 1] || 'default';
  } catch (error) {
    // Not a git repository, use hash of current working directory
    const cwd = process.cwd();
    const hash = createHash('sha256').update(cwd).digest('hex').substring(0, 8);
    
    // Combine basename with hash for readability
    const parts = cwd.split('/');
    const basename = parts[parts.length - 1] || 'project';
    return `${basename}-${hash}`;
  }
}

/**
 * Get the project-specific backlog directory
 */
export function getProjectBacklogDir(): string {
  const rootDir = getBacklogRootDir();
  const projectId = getProjectIdentifier();
  
  // If using legacy .agent dir, don't add project isolation
  const legacyDir = join(process.cwd(), '.agent');
  if (rootDir === legacyDir) {
    return rootDir;
  }

  return join(rootDir, 'projects', projectId);
}

/**
 * Resolve a path within the backlog directory structure
 * @param paths Path segments to join
 * @returns Absolute path
 */
export function resolveBacklogPath(...paths: string[]): string {
  const projectDir = getProjectBacklogDir();
  return join(projectDir, ...paths);
}

/**
 * Get the active backlog items directory
 */
export function getBacklogDir(): string {
  return resolveBacklogPath('Backlog');
}

/**
 * Get the completed backlog items directory
 */
export function getCompletedBacklogDir(): string {
  return resolveBacklogPath('COMPLETED_Backlog');
}

/**
 * Get environment information for debugging
 */
export function getPathInfo(): {
  rootDir: string;
  projectId: string;
  projectDir: string;
  backlogDir: string;
  completedDir: string;
  isLegacy: boolean;
} {
  const rootDir = getBacklogRootDir();
  const projectId = getProjectIdentifier();
  const projectDir = getProjectBacklogDir();
  const legacyDir = join(process.cwd(), '.agent');

  return {
    rootDir,
    projectId,
    projectDir,
    backlogDir: getBacklogDir(),
    completedDir: getCompletedBacklogDir(),
    isLegacy: rootDir === legacyDir,
  };
}
