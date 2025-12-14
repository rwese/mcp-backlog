#!/usr/bin/env bun

/**
 * Show current MCP Backlog path configuration
 * Usage: bun scripts/show-paths.js
 */

import { getPathInfo } from '../lib/path-resolver.ts';

const info = getPathInfo();

console.log('='.repeat(60));
console.log('MCP Backlog Path Configuration');
console.log('='.repeat(60));
console.log('');
console.log('Root Directory:       ', info.rootDir);
console.log('Project Identifier:   ', info.projectId);
console.log('Project Directory:    ', info.projectDir);
console.log('Active Backlog:       ', info.backlogDir);
console.log('Completed Backlog:    ', info.completedDir);
console.log('Using Legacy Mode:    ', info.isLegacy ? 'Yes' : 'No');
console.log('');
console.log('Environment Variables:');
console.log('  MCP_BACKLOG_DIR:    ', process.env.MCP_BACKLOG_DIR || '(not set)');
console.log('  XDG_DATA_HOME:      ', process.env.XDG_DATA_HOME || '(not set)');
console.log('  XDG_CONFIG_HOME:    ', process.env.XDG_CONFIG_HOME || '(not set)');
console.log('  XDG_CACHE_HOME:     ', process.env.XDG_CACHE_HOME || '(not set)');
console.log('');
console.log('='.repeat(60));
