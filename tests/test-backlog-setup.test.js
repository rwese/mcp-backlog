import { describe, it, expect } from 'bun:test';
import fs from 'node:fs';
import { BacklogSetupPlugin } from '../plugin/backlog-setup.js';

describe('backlog setup', () => {
  it('creates directories', async () => {
    // Ensure .agent doesn't exist before test
    if (fs.existsSync('.agent')) {
      fs.rmSync('.agent', { recursive: true, force: true });
    }

    // Mock $ function for shell commands
    const $ = (strings) => {
      const command = strings[0];
      if (command === 'mkdir -p .agent/Backlog') {
        fs.mkdirSync('.agent/Backlog', { recursive: true });
      } else if (command === 'mkdir -p .agent/Research') {
        fs.mkdirSync('.agent/Research', { recursive: true });
      }
      return Promise.resolve();
    };

    // Call the plugin with mock parameters
    const plugin = await BacklogSetupPlugin({ $ });

    // Simulate the "command.executed" event with a command starting with "/backlog"
    await plugin['command.executed']({ command: '/backlog test' });

    // Verify that the directories are created
    expect(fs.existsSync('.agent/Backlog')).toBe(true);
    expect(fs.existsSync('.agent/Research')).toBe(true);

    // Clean up after the test
    fs.rmSync('.agent', { recursive: true, force: true });
  });
});