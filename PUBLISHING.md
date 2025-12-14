# Publishing Guide

## Publishing to NPM

This package is configured for automated publishing via GitHub Actions.

### Automated Publishing (Recommended)

1. **Update version in package.json**
   ```bash
   npm version patch  # for bug fixes
   npm version minor  # for new features
   npm version major  # for breaking changes
   ```

2. **Push the tag**
   ```bash
   git push && git push --tags
   ```

3. **Create a GitHub Release**
   ```bash
   gh release create v1.0.1 --generate-notes
   ```
   
   Or manually at: https://github.com/rwese/mcp-backlog/releases/new

4. **The GitHub Action will automatically:**
   - Run tests
   - Build the project
   - Publish to NPM with provenance

### Manual Publishing

If you need to publish manually:

1. **Setup NPM authentication**
   ```bash
   npm login
   ```

2. **Build the project**
   ```bash
   bun run build
   ```

3. **Test the package locally**
   ```bash
   npm pack
   # This creates a .tgz file you can test
   npm install -g ./rwese-mcp-backlog-1.0.0.tgz
   ```

4. **Publish**
   ```bash
   npm publish --access public
   ```

## Pre-publish Checklist

- [ ] All tests pass (`bun test`)
- [ ] Build succeeds (`bun run build`)
- [ ] Version bumped in package.json
- [ ] CHANGELOG.md updated (if you create one)
- [ ] README.md is up to date
- [ ] Git tag created for the version
- [ ] No sensitive data in the package

## NPM Package Configuration

The package is configured with:

- **Scoped name**: `@rwese/mcp-backlog`
- **Public access**: Anyone can install
- **Files included**: dist/, lib/, README.md, LICENSE, QUICKSTART.md
- **Binary**: `mcp-backlog` command after global install
- **Provenance**: Enabled for supply chain security

## Testing the Package

### Test installation from NPM

```bash
# Test global installation
npm install -g @rwese/mcp-backlog

# Test the binary
mcp-backlog --help  # Should run the server

# Test with NPX
npx @rwese/mcp-backlog
```

### Test in an MCP client

Add to your MCP configuration:

```json
{
  "mcpServers": {
    "backlog": {
      "command": "mcp-backlog"
    }
  }
}
```

Restart your MCP client and verify the tools are available.

## Rollback a Release

If something goes wrong:

1. **Unpublish the version** (within 72 hours)
   ```bash
   npm unpublish @rwese/mcp-backlog@1.0.1
   ```

2. **Or deprecate it**
   ```bash
   npm deprecate @rwese/mcp-backlog@1.0.1 "This version has issues, use 1.0.2 instead"
   ```

## GitHub Actions Secrets

Required secrets in GitHub repository settings:

- `NPM_TOKEN`: Your NPM authentication token
  - Get it from: https://www.npmjs.com/settings/~/tokens
  - Type: Automation token
  - Add at: https://github.com/rwese/mcp-backlog/settings/secrets/actions

## Version History

- v1.0.0 - Initial release
  - 6 MCP tools for backlog management
  - Todo tracking with dependencies
  - Markdown-based storage
