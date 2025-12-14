# Release Notes - v1.1.0

## 🎉 XDG Base Directory Support with Multi-Project Isolation

### Overview
This release adds support for the XDG Base Directory Specification and enables seamless multi-project workflows by automatically isolating backlogs per project.

### ✨ New Features

#### 1. XDG Base Directory Compliance
- **Default location**: `~/.local/share/mcp-backlog/` instead of `./.agent/`
- **Respects standard environment variables**: `XDG_DATA_HOME`, `XDG_CONFIG_HOME`, `XDG_CACHE_HOME`
- **Cleaner project directories**: No more `.agent/` clutter in your repos
- **Centralized management**: All project backlogs in one organized location

#### 2. Multi-Project Isolation
Each project automatically gets its own isolated backlog directory:
- **Git repositories**: Identified by git root directory name
- **Non-git projects**: Identified by directory name + unique hash
- **No conflicts**: Work on multiple projects simultaneously without data mixing

Example directory structure:
```
~/.local/share/mcp-backlog/
└── projects/
    ├── website/          # Git repo: ~/dev/website
    ├── api-server/       # Git repo: ~/dev/api-server
    └── experiment-a1b2/  # Non-git: ~/tmp/experiment
```

#### 3. Environment Variable Configuration
Customize storage location via environment variables:
- `MCP_BACKLOG_DIR`: Override the entire backlog location
- `XDG_DATA_HOME`: Use custom XDG data directory (affects all XDG apps)

Set in your MCP client config:
```json
{
  "mcpServers": {
    "backlog": {
      "command": "npx",
      "args": ["-y", "@rwese/mcp-backlog"],
      "env": {
        "MCP_BACKLOG_DIR": "/custom/path"
      }
    }
  }
}
```

#### 4. Path Configuration Utility
New script to show your current configuration:
```bash
bun run show-paths
```

### 📚 Documentation
- **CONFIGURATION.md**: Comprehensive guide to path configuration
- **CHANGELOG_XDG.md**: Detailed implementation notes
- **README.md**: Updated with XDG and multi-project examples

### 🔧 Technical Changes
- New `lib/path-resolver.ts` module for centralized path management
- Updated all file operations to use dynamic paths
- Added 11 new tests for path resolution
- All existing tests still passing

### ✅ Backward Compatibility
**100% backward compatible** - no breaking changes:
- Existing `.agent/` directories are automatically detected and used
- New installations default to XDG-compliant directories
- Seamless migration path for existing users

### 📦 NPX Usage
Use with npx (no installation required):
```json
{
  "mcpServers": {
    "backlog": {
      "command": "npx",
      "args": ["-y", "@rwese/mcp-backlog"]
    }
  }
}
```

### 🧪 Testing
- ✅ 11 new path resolver tests (all passing)
- ✅ Build successful
- ✅ NPX execution verified
- ✅ Multi-project isolation verified
- ✅ Environment variables tested

### 🚀 Upgrade Instructions

#### For New Users
Just use it! The XDG-compliant directories will be created automatically.

#### For Existing Users
**Option 1**: Continue using `.agent/` (no action needed)
- Your existing `.agent/` directory will be detected and used automatically

**Option 2**: Migrate to XDG directories
```bash
# Find your XDG path
bun run show-paths

# Move your .agent directory
mkdir -p ~/.local/share/mcp-backlog/projects/$(basename $(git rev-parse --show-toplevel))
mv .agent/* ~/.local/share/mcp-backlog/projects/$(basename $(git rev-parse --show-toplevel))/
rmdir .agent
```

### 📋 Files Changed
- **New**: `lib/path-resolver.ts`, `CONFIGURATION.md`, `CHANGELOG_XDG.md`, `scripts/show-paths.js`, `tests/test-path-resolver.test.js`
- **Modified**: `src/index.ts`, `lib/backlog-shared.ts`, `lib/backlog-todo-shared.ts`, `README.md`, `package.json`

### 🙏 Benefits
1. **Standards compliance**: Follows established XDG conventions
2. **Better organization**: Centralized backlog management
3. **Multi-project support**: Work on many projects without conflicts
4. **Easier backups**: One directory to backup/sync
5. **Cleaner repos**: No more .agent/ in version control
6. **Flexible config**: Override via environment variables

---

## Installation

```bash
# With NPX (recommended - no installation)
npx -y @rwese/mcp-backlog

# Global installation
npm install -g @rwese/mcp-backlog

# Local installation
npm install @rwese/mcp-backlog
```

## Full Changelog
See [CHANGELOG_XDG.md](./CHANGELOG_XDG.md) for detailed implementation notes.
